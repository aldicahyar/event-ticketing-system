import {
  Injectable,
  Logger,
  RawBodyRequest,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';

// ── Prisma payload type aliases (Fix #5) ─────────────────────────
// Replaces `booking: any` in private methods with proper Prisma types
// that include the relations each method actually uses.
type BookingWithEvent = Prisma.t_trx_bookingsGetPayload<{
  include: { event: true };
}>;

type BookingWithSeats = Prisma.t_trx_bookingsGetPayload<{
  include: { seats: true };
}>;

// ── Recovery result type (Fix #15: consistent return shape) ──────
export interface RecoverSessionResult {
  status: 'confirmed' | 'expired' | 'pending' | 'new_session';
  booking_id: string;
  booking_code: string;
  booking_status: string;
  checkout_url: string | null;
  session_id?: string;
  expires_at: string | null;
  message: string;
}

// ── Resumable session (drives the "Continue Payment" buttons on ──
// the dashboard & order history pages) ─────────────────────────────
export interface ResumableSession {
  booking_id: string;
  booking_code: string;
  event_id: string;
  event_title: string;
  total_price: number;
  currency: string;
  /** Validated Stripe Checkout URL the user is redirected back to. */
  checkout_url: string;
  session_id?: string;
  /** ISO string of the booking reservation window deadline. */
  expires_at: string | null;
  message: string;
}

// ── Payment processing outcome (race condition fix) ──────────────
// Exported so webhook handlers can use the return type.
export type PaymentOutcome = 'confirmed' | 'skipped' | 'late';

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);
  private recoverInterval?: NodeJS.Timeout; // Fix #1: optional (definite assignment)
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService, // Fix #3: inject ConfigService
    private readonly notificationsService: NotificationsService,
  ) {
    // Fix #2: validate STRIPE_SECRET_KEY at startup instead of unsafe `as string`
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY environment variable is required to start the payments service',
      );
    }

    // Fix #3: use ConfigService for apiVersion with a sensible fallback
    const apiVersion = (this.configService.get<string>('STRIPE_API_VERSION') ??
      '2023-10-16') as Stripe.LatestApiVersion;

    this.stripe = new Stripe(secretKey, {
      apiVersion,
    });

    // Fix #4: frontend URL from config with fallback for local dev
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ??
      'http://localhost:3001';
  }

  onModuleInit() {
    // Poll pending bookings every 30 seconds to catch payments that succeeded
    // in Stripe but whose webhook was missed/delayed. This is the safety net
    // that also powers the "Continue Payment" recovery flow on the frontend.
    this.recoverInterval = setInterval(() => this.pollPendingBookings(), 30 * 1000);
  }

  onModuleDestroy() {
    if (this.recoverInterval) clearInterval(this.recoverInterval);
  }

  // ── Helper: extract error message from unknown catch (Fix #7) ────
  private getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }

  async handleWebhook(
    req: RawBodyRequest<Request>,
    signature: string,
  ): Promise<{ received: boolean }> {
    let event: Stripe.Event;

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      }

      if (!req.rawBody) {
        throw new Error('Missing raw body for Stripe signature validation');
      }

      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        webhookSecret,
      );
    } catch (err: unknown) {
      // Fix #7: use `unknown` instead of `any`
      this.logger.error(
        `Webhook signature verification failed. ${this.getErrorMessage(err)}`,
      );
      throw err;
    }

    this.logger.log(`Received Stripe Webhook Event: ${event.type}`);

    // Fix #12: handle additional event types beyond just `checkout.session.completed`
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.processSuccessfulPayment(session);
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      this.logger.log(
        `Stripe checkout session expired: ${session.id} (booking: ${session.client_reference_id ?? 'N/A'})`,
      );
    }

    return { received: true };
  }

  /**
   * Fallback method: directly verify a Stripe checkout session by ID.
   * Called by the frontend success page when the user returns from Stripe
   * — compensates for missed or delayed webhook delivery.
   */
  async verifyAndSyncStripeSession(
    session_id: string,
    user_id: string,
  ): Promise<{
    booking_status: string;
    payment_status: string;
    booking: any;
  }> {
    if (!session_id) {
      throw new BadRequestException('session_id is required');
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.retrieve(session_id);
    } catch (err: unknown) {
      this.logger.error(
        `Failed to retrieve Stripe session ${session_id}: ${this.getErrorMessage(err)}`,
      );
      throw new BadRequestException('Invalid or inaccessible Stripe session');
    }

    const booking_id = session.client_reference_id;
    if (!booking_id) {
      throw new NotFoundException('No booking linked to this Stripe session');
    }

    const booking = await this.prisma.t_trx_bookings.findUnique({
      where: { id: booking_id },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${booking_id} not found`);
    }

    if (booking.user_id !== user_id) {
      throw new BadRequestException('This booking does not belong to you');
    }

    if (session.payment_status === 'paid' && booking.status !== 'CONFIRMED') {
      this.logger.log(
        `Stripe session ${session_id} is paid but booking ${booking.booking_code} is ${booking.status} — syncing now via fallback`,
      );
      await this.processSuccessfulPayment(session);
    }

    const refreshed = await this.prisma.t_trx_bookings.findUnique({
      where: { id: booking_id },
      include: {
        event: { include: { venue: true } },
        seats: true,
        payment: true,
        tickets: true,
      },
    });

    return {
      booking_status: refreshed?.status ?? booking.status,
      payment_status: session.payment_status,
      booking: refreshed,
    };
  }

  /**
   * Recovery endpoint: given a booking_id owned by the user, inspect the
   * linked Stripe checkout session and return a status the frontend can act
   * on:
   *   - 'confirmed'  → payment already succeeded; booking is now CONFIRMED.
   *   - 'expired'    → booking window lapsed; user must re-book.
   *   - 'pending'    → session still open; frontend can re-open the Stripe URL.
   *   - 'new_session'→ original Stripe session expired; a new session was
   *                    created (only if booking is still within its window).
   *
   * This is called by the /checkout/pending page when the user returns after
   * closing the Stripe tab, and also drives the "Continue Payment" button.
   */
  // Fix #8: explicit return type annotation
  // Fix #15: return type is now a consistent interface (RecoverSessionResult)
  async recoverSession(
    booking_id: string,
    user_id: string,
  ): Promise<RecoverSessionResult> {
    const booking = await this.prisma.t_trx_bookings.findFirst({
      where: { id: booking_id, user_id },
      include: { event: true },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${booking_id} not found`);
    }

    // Already confirmed — nothing to recover.
    if (booking.status === 'CONFIRMED') {
      return {
        status: 'confirmed',
        booking_id: booking.id,
        booking_code: booking.booking_code,
        booking_status: booking.status,
        checkout_url: null,
        expires_at: booking.expires_at?.toISOString() ?? null,
        message: 'Payment already completed — your tickets are confirmed.',
      };
    }

    // Booking expired — cannot recover, user must re-book.
    if (booking.status === 'EXPIRED' || booking.status === 'CANCELLED') {
      return {
        status: 'expired',
        booking_id: booking.id,
        booking_code: booking.booking_code,
        booking_status: booking.status,
        checkout_url: null,
        expires_at: booking.expires_at?.toISOString() ?? null,
        message:
          'The reservation window has expired. Please place a new booking to get your seats.',
      };
    }

    // Booking is PENDING — inspect the Stripe session.
    let session: Stripe.Checkout.Session | null = null;
    if (booking.stripe_session_id) {
      try {
        session = await this.stripe.checkout.sessions.retrieve(
          booking.stripe_session_id,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `recoverSession: failed to retrieve session ${booking.stripe_session_id}: ${this.getErrorMessage(err)}`,
        );
      }
    }

    // Case A: Stripe says the session is already paid → sync now via the
    // normal confirmation path. This handles the race where the webhook was
    // missed but the user actually completed payment before closing the tab.
    if (session && session.payment_status === 'paid') {
      this.logger.log(
        `recoverSession: session ${session.id} is paid — syncing booking ${booking.booking_code}`,
      );
      await this.processSuccessfulPayment(session);
      return {
        status: 'confirmed',
        booking_id: booking.id,
        booking_code: booking.booking_code,
        booking_status: 'CONFIRMED',
        checkout_url: null,
        expires_at: booking.expires_at?.toISOString() ?? null,
        message: 'Payment detected and confirmed — your tickets are ready.',
      };
    }

    // Case B: Stripe session is still open and not expired → return the URL
    // so the frontend can re-open it via the "Continue Payment" button.
    if (session && session.status === 'open' && session.url) {
      return {
        status: 'pending',
        booking_id: booking.id,
        booking_code: booking.booking_code,
        booking_status: booking.status,
        checkout_url: session.url,
        expires_at: booking.expires_at?.toISOString() ?? null,
        message: 'Your checkout session is still open. Click Continue Payment to resume.',
      };
    }

    // Case C: Stripe session is expired/closed but the booking window is
    // still active. Create a new Stripe session so the user can pay.
    const bookingExpired = booking.expires_at
      ? new Date(booking.expires_at).getTime() < Date.now()
      : false;
    if (bookingExpired) {
      return {
        status: 'expired',
        booking_id: booking.id,
        booking_code: booking.booking_code,
        booking_status: booking.status,
        checkout_url: null,
        expires_at: booking.expires_at?.toISOString() ?? null,
        message: 'The reservation window has expired. Please place a new booking.',
      };
    }

    // Create a fresh Stripe session for the same booking.
    const newSession = await this.createFreshCheckoutSession(
      booking as BookingWithEvent,
    );
    return {
      status: 'new_session',
      booking_id: booking.id,
      booking_code: booking.booking_code,
      booking_status: booking.status,
      checkout_url: newSession.url,
      session_id: newSession.id,
      expires_at: booking.expires_at?.toISOString() ?? null,
      message: 'A new checkout session has been created. Click Continue Payment to pay.',
    };
  }

  /**
   * List the current user's unfinished but still-resumable Stripe checkout
   * sessions. Powers the "Continue Payment" buttons on the dashboard and
   * order-history pages.
   *
   * A booking is included only when:
   *   - it belongs to the user and is still PENDING,
   *   - it has a stripe_session_id,
   *   - the reservation window has not lapsed, and
   *   - Stripe reports the session as `open` (or a fresh session could be
   *     created because the booking window is still active).
   *
   * Sessions that turn out to be already `paid` are synced to CONFIRMED here
   * (side effect of recoverSession) and excluded from the result — so the
   * button disappears in near real-time once payment succeeds.
   *
   * NOTE: this is the storage-backed view of "active Stripe sessions per
   * user". Because it reads from t_trx_bookings.stripe_session_id (server
   * side), it survives the user clearing browser cache or switching devices
   * — unlike the localStorage-only pendingCheckout used by the checkout page.
   */
  async getResumableSessions(user_id: string): Promise<ResumableSession[]> {
    const candidates = await this.prisma.t_trx_bookings.findMany({
      where: {
        user_id,
        status: 'PENDING',
        stripe_session_id: { not: null },
      },
      orderBy: { booked_at: 'desc' },
      take: 5,
      include: { event: true },
    });

    const resumable: ResumableSession[] = [];

    for (const b of candidates) {
      // Fast guard: if the reservation window already lapsed, skip without
      // hitting the Stripe API. The expiry cron will mark it EXPIRED shortly.
      const windowLapsed = b.expires_at
        ? new Date(b.expires_at).getTime() < Date.now()
        : false;
      if (windowLapsed) continue;

      try {
        const result = await this.recoverSession(b.id, user_id);
        if (
          (result.status === 'pending' || result.status === 'new_session') &&
          result.checkout_url
        ) {
          resumable.push({
            booking_id: result.booking_id,
            booking_code: result.booking_code,
            event_id: b.event_id,
            event_title: b.event?.title ?? 'Event',
            total_price: Number(b.total_price),
            currency: b.currency ?? 'USD',
            checkout_url: result.checkout_url,
            session_id: result.session_id,
            expires_at: result.expires_at,
            message: result.message,
          });
        }
      } catch (err: unknown) {
        this.logger.warn(
          `getResumableSessions: failed for booking ${b.booking_code}: ${this.getErrorMessage(err)}`,
        );
      }
    }

    return resumable;
  }

  /**
   * Create a new Stripe Checkout Session for an existing PENDING booking.
   * Used when the original Stripe session expired but the booking window is
   * still open. The new session id is persisted on the booking so subsequent
   * recovery attempts reference the latest session.
   */
  // Fix #5: replace `booking: any` with proper Prisma payload type
  private async createFreshCheckoutSession(
    booking: BookingWithEvent,
  ): Promise<Stripe.Checkout.Session> {
    const event =
      booking.event ??
      (await this.prisma.t_trx_events.findUnique({
        where: { id: booking.event_id },
      }));
    if (!event) {
      throw new BadRequestException('Linked event no longer exists');
    }

    // Fix #11: Stripe requires expires_at to be at least 30 minutes in the
    // future (and at most 24 hours). If the booking window is shorter, we
    // use Stripe's minimum and rely on our own expiry validation +
    // handlePaymentAfterExpiry to catch post-expiry payments.
    const nowSec = Math.floor(Date.now() / 1000);
    const bookingExpirySec = booking.expires_at
      ? Math.floor(new Date(booking.expires_at).getTime() / 1000)
      : nowSec + 15 * 60;
    const minStripeExpiry = nowSec + 30 * 60; // Stripe minimum: 30 min
    const maxStripeExpiry = nowSec + 24 * 60 * 60; // Stripe maximum: 24 h
    const expiresAtSec = Math.min(
      Math.max(bookingExpirySec, minStripeExpiry),
      maxStripeExpiry,
    );

    // Fix #15 (validation): ensure total_price is a valid positive number
    const unitAmount = Math.round(Number(booking.total_price) * 100);
    if (isNaN(unitAmount) || unitAmount <= 0) {
      throw new BadRequestException(
        `Booking ${booking.booking_code} has an invalid total_price: ${booking.total_price}`,
      );
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: event.currency.toLowerCase(),
            product_data: {
              name: `${event.title} - Ticketing`,
              description: `Booking Code: ${booking.booking_code}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      expires_at: expiresAtSec,
      // Fix #4: use configurable frontend URL instead of hardcoded localhost
      success_url: `${this.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/checkout/pending?booking=${booking.id}`,
      client_reference_id: booking.id,
    });

    await this.prisma.t_trx_bookings.update({
      where: { id: booking.id },
      data: { stripe_session_id: session.id },
    });

    this.logger.log(
      `Created fresh Stripe session ${session.id} for booking ${booking.booking_code}`,
    );
    return session;
  }

  /**
   * Periodic safety net: poll all PENDING bookings with a stripe_session_id
   * and check whether the Stripe session has been paid. If yes, run the normal
   * confirmation path. This catches the case where:
   *   - The user completed payment on Stripe, then closed the tab.
   *   - The webhook was missed or delayed.
   *   - The user never came back to /checkout/success.
   * Without this, the booking would silently EXPIRE even though the user
   * was charged — the root cause of bug #2 in the previous fix.
   */
  private async pollPendingBookings(): Promise<void> {
    try {
      // Fix #15: filter to bookings created within the last 2 hours to avoid
      // wasting Stripe API calls on stale sessions that will never be paid.
      // The 15-minute booking window + 24-hour Stripe session lifetime means
      // anything older than 2 hours has either expired or been resolved.
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const pending = await this.prisma.t_trx_bookings.findMany({
        where: {
          status: 'PENDING',
          stripe_session_id: { not: null },
          booked_at: { gte: twoHoursAgo },
        },
        select: {
          id: true,
          booking_code: true,
          stripe_session_id: true,
          expires_at: true,
        },
        take: 20,
      });

      for (const b of pending) {
        if (!b.stripe_session_id) continue;
        try {
          const session = await this.stripe.checkout.sessions.retrieve(
            b.stripe_session_id,
          );
          if (session.payment_status === 'paid') {
            this.logger.log(
              `pollPendingBookings: session ${session.id} for booking ${b.booking_code} is paid — syncing`,
            );
            await this.processSuccessfulPayment(session);
          }
        } catch (err: unknown) {
          this.logger.warn(
            `pollPendingBookings: failed to check session for booking ${b.booking_code}: ${this.getErrorMessage(err)}`,
          );
        }
      }
    } catch (err: unknown) {
      this.logger.error(`pollPendingBookings failed: ${this.getErrorMessage(err)}`);
    }
  }

  /**
   * Returns true if the booking has a completed Stripe checkout session.
   * Used by expireOldBookings before giving up on a PENDING booking that has
   * passed its expires_at window (webhook may have been delayed).
   */
  async isBookingActuallyPaid(booking_id: string): Promise<boolean> {
    try {
      // Fix #10: paginate through all sessions in the time window instead
      // of relying on a single page of 100 results. We use manual pagination
      // with `starting_after` to iterate until `has_more` is false.
      // Note: stripe.checkout.sessions.list does not accept client_reference_id
      // as a server-side filter; we fetch a recent window and filter in memory.
      const oneWeekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const page = await this.stripe.checkout.sessions.list({
          created: { gte: oneWeekAgo },
          limit: 100,
          starting_after: startingAfter,
        });
        for (const s of page.data) {
          if (
            s.client_reference_id === booking_id &&
            s.payment_status === 'paid'
          ) {
            return true;
          }
        }
        hasMore = page.has_more;
        startingAfter = page.data.length > 0
          ? page.data[page.data.length - 1].id
          : undefined;
      }
      return false;
    } catch (err: unknown) {
      this.logger.warn(
        `Stripe session lookup failed for booking ${booking_id}: ${this.getErrorMessage(err)}`,
      );
      return false;
    }
  }

  /**
   * Best-effort expiry of a Stripe Checkout Session linked to a booking.
   * Called when a user (or admin) cancels a PENDING booking — ensures the
   * user can no longer complete payment on the now-cancelled session.
   *
   * This is non-fatal: if the session is already expired/paid, or the Stripe
   * API call fails, the cancellation still proceeds (the DB status change is
   * the source of truth). Any error is logged and swallowed.
   */
  async expireStripeSession(
    stripe_session_id: string,
    booking_code: string,
  ): Promise<void> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(
        stripe_session_id,
      );

      // Only expire sessions that are still open (user could still pay).
      if (session.status === 'open') {
        await this.stripe.checkout.sessions.expire(stripe_session_id);
        this.logger.log(
          `Expired Stripe session ${stripe_session_id} for cancelled booking ${booking_code}`,
        );
      }
    } catch (err: unknown) {
      // Non-fatal: the booking is already CANCELLED in the DB; this just
      // prevents the user from paying on a dead session.
      this.logger.warn(
        `expireStripeSession: could not expire session ${stripe_session_id} ` +
          `for booking ${booking_code}: ${this.getErrorMessage(err)}`,
      );
    }
  }

  // Made public so webhook handlers (CheckoutCompletedHandler,
  // AsyncPaymentSucceededHandler) can delegate to this method.
  async processSuccessfulPayment(
    session: Stripe.Checkout.Session,
  ): Promise<PaymentOutcome> {
    const booking_id = session.client_reference_id;
    if (!booking_id) {
      this.logger.error('No client_reference_id found in checkout session');
      return 'skipped';
    }

    // Fix #6: use `const` instead of `let` so TypeScript narrows the null
    // check properly — eliminates the need for `!` assertions in the
    // $transaction callback below.
    const booking = await this.prisma.t_trx_bookings.findUnique({
      where: { id: booking_id },
      include: { seats: true },
    });

    if (!booking) {
      this.logger.error(`Booking ${booking_id} not found for completed session`);
      return 'skipped';
    }

    if (booking.status === 'CONFIRMED') {
      this.logger.warn(`Booking ${booking_id} is already CONFIRMED — skipping`);
      return 'skipped';
    }

    const amountPaid = session.amount_total ? session.amount_total / 100 : 0;
    const event_id = booking.event_id;

    // === OUTER EXPIRY VALIDATION (fast path) ===
    // If the booking is ALREADY expired when we first read it, skip straight
    // to refund. This avoids entering a transaction for the obvious case.
    const outerIsExpired =
      booking.status === 'EXPIRED' ||
      booking.status === 'CANCELLED' ||
      (booking.expires_at
        ? new Date(booking.expires_at).getTime() < Date.now()
        : false);

    if (outerIsExpired) {
      this.logger.warn(
        `Payment received for booking ${booking.booking_code} but it is EXPIRED ` +
          `(status=${booking.status}, expires_at=${booking.expires_at?.toISOString()}). ` +
          `Initiating automatic refund.`,
      );
      await this.handlePaymentAfterExpiry(
        session,
        booking as BookingWithSeats,
        amountPaid,
      );
      return 'late';
    }

    // === NORMAL CONFIRMATION PATH (with atomic expiry re-check) ===
    // Use seat_ids snapshot from booking record (permanent) rather than
    // relying on the seats relation, which may be empty if the cleanup job
    // raced and released seats between the payment and this webhook.
    const seatIdsFromSnapshot =
      booking.seat_ids && booking.seat_ids.length > 0
        ? booking.seat_ids
        : booking.seats.map((s) => s.id);

    let seatIds = seatIdsFromSnapshot;

    // RACE CONDITION FIX: The transaction returns an outcome so we know
    // whether to issue a refund after commit. The critical change is the
    // conditional updateMany below: it checks BOTH status='PENDING' AND
    // expires_at > NOW() atomically at the SQL level. If the booking
    // expired between the outer read and this UPDATE (the race window),
    // zero rows are affected and we know to handle it as a late payment.
    const txOutcome = await this.prisma.$transaction(async (tx) => {
      // Race-condition safety: if seats were released (booking_id = null,
      // status = AVAILABLE) by the cleanup job just before this webhook,
      // try to re-attach them.
      if (booking.seats.length === 0 && seatIdsFromSnapshot.length > 0) {
        this.logger.warn(
          `Booking ${booking.booking_code}: seats relation empty — attempting to re-acquire from snapshot`,
        );
        const candidates = await tx.t_mtr_seats.findMany({
          where: {
            id: { in: seatIdsFromSnapshot },
            event_id,
            status: 'AVAILABLE',
            booking_id: null,
          },
        });
        if (candidates.length === seatIdsFromSnapshot.length) {
          seatIds = candidates.map((s) => s.id);
          this.logger.log(
            `All ${seatIds.length} seats re-acquired for booking ${booking.booking_code}`,
          );
        } else {
          this.logger.error(
            `Cannot re-acquire seats for booking ${booking.booking_code} — only ${candidates.length}/${seatIdsFromSnapshot.length} still AVAILABLE. Payment recorded but tickets not issued.`,
          );
          seatIds = [];
        }
      }

      // ── ATOMIC EXPIRY-GUARDED CONFIRMATION ──────────────────────
      // This single UPDATE statement is the race-condition fix. PostgreSQL
      // evaluates the WHERE clause and the UPDATE atomically — no other
      // transaction (webhook, cron, cleanup job) can slip in between the
      // expiry check and the status change.
      //
      // Conditions that must ALL be true for the update to succeed:
      //   1. id matches this booking
      //   2. status is still 'PENDING' (not CONFIRMED/EXPIRED/CANCELLED)
      //   3. expires_at is NULL OR still in the future
      //
      // If any condition fails, count=0 and we investigate below.
      const now = new Date();
      const updated = await tx.t_trx_bookings.updateMany({
        where: {
          id: booking.id,
          status: 'PENDING',
          OR: [{ expires_at: null }, { expires_at: { gt: now } }],
        },
        data: {
          status: 'CONFIRMED',
          confirmed_at: now,
        },
      });

      if (updated.count === 0) {
        // The conditional update did not match. Re-read the row (inside
        // the same transaction) to determine WHY it failed.
        const current = await tx.t_trx_bookings.findUnique({
          where: { id: booking.id },
          select: { status: true, expires_at: true },
        });

        if (current?.status === 'CONFIRMED') {
          // Another webhook/poll cycle confirmed it first.
          this.logger.warn(
            `Booking ${booking.booking_code} was already CONFIRMED by a concurrent process — skipping`,
          );
          return { kind: 'skipped' as const };
        }

        // The booking expired or was cancelled between our outer read and
        // this atomic update. This is the race condition we're fixing:
        // a payment that arrived ~10s before expiry but was processed
        // ~10s after. Record it as a late payment for audit + refund.
        this.logger.warn(
          `RACE CONDITION DETECTED: Booking ${booking.booking_code} was PENDING at read time ` +
            `(expires_at=${booking.expires_at?.toISOString()}) but is now ${current?.status ?? 'null'} ` +
            `(current expires_at=${current?.expires_at?.toISOString()}). Payment will be refunded.`,
        );
        return { kind: 'late' as const };
      }

      // ── Confirmation succeeded — create dependent records ───────
      // 1. Create t_trx_payments Record (idempotent: skip if payment already
      //    recorded via provider_tx_id unique index).
      const existingPayment = await tx.t_trx_payments.findUnique({
        where: { provider_tx_id: session.id },
      });
      if (!existingPayment) {
        await tx.t_trx_payments.create({
          data: {
            booking_id: booking.id,
            amount: amountPaid,
            currency: (session.currency || 'usd').toUpperCase(),
            provider: 'STRIPE',
            provider_tx_id: session.id,
            status: 'COMPLETED',
            paid_at: now,
          },
        });
      }

      if (seatIds.length > 0) {
        // 2. Re-associate seats with the booking + set to SOLD
        await tx.t_mtr_seats.updateMany({
          where: { id: { in: seatIds } },
          data: { status: 'SOLD', booking_id: booking.id },
        });

        // 3. Generate E-Tickets for each seat (skip duplicates if any exist)
        for (const seat_id of seatIds) {
          const existingTicket = await tx.t_trx_tickets.findFirst({
            where: { booking_id: booking.id, seat_id },
          });
          if (!existingTicket) {
            await tx.t_trx_tickets.create({
              data: {
                booking_id: booking.id,
                seat_id,
                qr_code: uuidv4(),
              },
            });
          }
        }
      }

      return { kind: 'confirmed' as const };
    });

    // ── Handle transaction outcome ─────────────────────────────────
    if (txOutcome.kind === 'late') {
      // The booking expired during processing (race condition).
      // Refund the customer. handlePaymentAfterExpiry is idempotent — it
      // checks for an existing payment record before creating one.
      await this.handlePaymentAfterExpiry(
        session,
        booking as BookingWithSeats,
        amountPaid,
      );
      return 'late';
    }

    if (txOutcome.kind === 'skipped') {
      return 'skipped';
    }

    this.logger.log(
      `Successfully processed payment for Booking ${booking.booking_code} (was ${booking.status} → now CONFIRMED)`,
    );

    // Send payment-success confirmation email (non-blocking).
    await this.notifyPaymentSuccess(booking, amountPaid, session);

    return 'confirmed';
  }

  /**
   * Handle the case where a Stripe payment succeeds AFTER the booking's
   * expires_at window has lapsed. This is a critical path: the seats have
   * already been released back to the pool, so we cannot honour the original
   * booking. Instead we:
   *   1. Record the payment with status COMPLETED (for audit / finance)
   *   2. Issue an automatic refund via Stripe
   *   3. Update payment status to REFUNDED
   *   4. Mark booking as CANCELLED with cancelled_reason for traceability
   *   5. Send user a notification explaining the failure
   *
   * This ensures consistency between Stripe (refunded) and the website
   * (no phantom confirmed booking without seats).
   */
  // Fix #5: replace `booking: any` with BookingWithSeats
  private async handlePaymentAfterExpiry(
    session: Stripe.Checkout.Session,
    booking: BookingWithSeats,
    amountPaid: number,
  ): Promise<void> {
    // ── AUDIT LOG: record every late payment attempt ──────────────
    // This structured log captures all details needed for finance
    // reconciliation, compliance audits, and debugging edge cases.
    const auditTime = new Date();
    const expiryTime = booking.expires_at ?? null;
    const delayMs = expiryTime
      ? auditTime.getTime() - new Date(expiryTime).getTime()
      : null;

    this.logger.warn(
      `[AUDIT] LATE_PAYMENT_DETECTED | booking=${booking.booking_code} | ` +
        `booking_id=${booking.id} | session=${session.id} | ` +
        `amount=${amountPaid} ${session.currency?.toUpperCase() ?? 'USD'} | ` +
        `expires_at=${expiryTime?.toISOString() ?? 'null'} | ` +
        `processed_at=${auditTime.toISOString()} | ` +
        `delay_after_expiry=${delayMs !== null ? `${delayMs}ms` : 'unknown'} | ` +
        `booking_status_at_detection=${booking.status}`,
    );

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent | null)?.id;

    // 1. Record the payment (for audit) — idempotent on provider_tx_id
    const existingPayment = await this.prisma.t_trx_payments.findUnique({
      where: { provider_tx_id: session.id },
    });

    let paymentRecordId: string | null = existingPayment?.id ?? null;

    if (!existingPayment) {
      const created = await this.prisma.t_trx_payments.create({
        data: {
          booking_id: booking.id,
          amount: amountPaid,
          currency: (session.currency || 'usd').toUpperCase(),
          provider: 'STRIPE',
          provider_tx_id: session.id,
          status: 'COMPLETED',
          paid_at: new Date(),
        },
      });
      paymentRecordId = created.id;
    }

    // 2. Issue automatic refund via Stripe
    let refundId: string | null = null;
    let refundStatus: string = 'FAILED';
    try {
      if (paymentIntentId) {
        const refund = await this.stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: 'requested_by_customer',
          metadata: {
            booking_id: booking.id,
            booking_code: booking.booking_code,
            reason: 'PAYMENT_AFTER_EXPIRY',
          },
        });
        refundId = refund.id;
        refundStatus = refund.status ?? 'pending';
        this.logger.log(
          `Refund ${refund.id} (${refund.status}) issued for expired booking ${booking.booking_code}`,
        );
      } else {
        this.logger.error(
          `Cannot refund booking ${booking.booking_code}: no payment_intent on session ${session.id}`,
        );
      }
    } catch (err: unknown) {
      this.logger.error(
        `Refund failed for booking ${booking.booking_code}: ${this.getErrorMessage(err)}`,
      );
    }

    // 3. Update payment status to REFUNDED
    if (paymentRecordId && refundStatus === 'succeeded') {
      await this.prisma.t_trx_payments.update({
        where: { id: paymentRecordId },
        data: { status: 'REFUNDED' },
      });
    } else if (paymentRecordId) {
      await this.prisma.t_trx_payments.update({
        where: { id: paymentRecordId },
        data: { status: 'FAILED' },
      });
    }

    // Fix #14: update booking status to CANCELLED (not just cancelled_reason).
    // Leaving the booking in PENDING/EXPIRED without a status change means
    // the booking remains in an ambiguous state — queries that filter on
    // status will still see it, and the audit trail is incomplete.
    // 4. Update booking status + cancelled_reason for audit trail
    await this.prisma.t_trx_bookings.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        cancelled_at: auditTime,
        cancelled_reason:
          `PAYMENT_AFTER_EXPIRY_REFUNDED ` +
          `(refund: ${refundId ?? 'none'}, status: ${refundStatus}, ` +
          `delay: ${delayMs !== null ? `${delayMs}ms` : 'unknown'})`,
      },
    });

    // 5. Notify the user (best-effort, non-blocking)
    try {
      await this.notifyUserOfExpiredPayment(booking, refundId, refundStatus);
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to send expired-payment notification for booking ${booking.booking_code}: ${this.getErrorMessage(err)}`,
      );
    }
  }

  /**
   * Send a payment-success confirmation email via the NotificationsService.
   * Fetches event and user details needed to populate the template.
   * Non-blocking — errors are logged but never crash the payment flow.
   */
  private async notifyPaymentSuccess(
    booking: BookingWithSeats,
    amountPaid: number,
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    try {
      const user = await this.prisma.t_mtr_users.findUnique({
        where: { id: booking.user_id },
        select: { email: true, name: true },
      });

      if (!user?.email) return;

      const event = await this.prisma.t_trx_events.findUnique({
        where: { id: booking.event_id },
        select: {
          title: true,
          start_date_time: true,
          venue: { select: { name: true, city: true } },
        },
      });

      // Format seats as human-readable labels (e.g. "A1, A2, B3")
      // using the seats relation, NOT the raw seat_ids UUIDs.
      const seatLabels = (booking.seats ?? []).map(
        (s: { row: string; number: number }) => `${s.row}${s.number}`,
      );

      await this.notificationsService.sendPaymentSuccess(user.email, {
        bookingCode: booking.booking_code,
        eventName: event?.title ?? 'Event',
        customerName: user.name ?? 'Customer',
        // amountPaid is already in the main currency unit (converted from
        // cents at line 670), so pass it directly — do NOT divide by 100 again.
        totalAmount: amountPaid,
        currency: session.currency ?? 'usd',
        seatCount: seatLabels.length,
        seats: seatLabels,
        eventDate: event?.start_date_time?.toISOString() ?? null,
        venueName: event?.venue?.name ?? null,
        venueCity: event?.venue?.city ?? null,
        ticketUrl: `${this.frontendUrl}/dashboard/my-tickets?order=${booking.id}`,
      });
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to send payment-success email for booking ${booking.booking_code}: ${this.getErrorMessage(err)}`,
      );
    }
  }

  /**
   * Send the user a notification that their payment was received after the
   * reservation window expired and has been automatically refunded.
   */
  // Fix #5: replace `booking: any` with BookingWithSeats
  private async notifyUserOfExpiredPayment(
    booking: BookingWithSeats,
    refundId: string | null,
    refundStatus: string,
  ): Promise<void> {
    const user = await this.prisma.t_mtr_users.findUnique({
      where: { id: booking.user_id },
      select: { email: true, name: true },
    });

    if (!user?.email) {
      this.logger.warn(
        `No email on file for user ${booking.user_id} — cannot send refund notification for booking ${booking.booking_code}`,
      );
      return;
    }

    await this.notificationsService.sendPaymentRefunded(user.email, {
      bookingCode: booking.booking_code,
      eventName: 'Event',
      customerName: user.name ?? 'Customer',
      refundAmount: Number(booking.total_price ?? 0),
      currency: booking.currency ?? 'usd',
      refundId,
      refundStatus,
      reason: 'Payment received after the 15-minute reservation window expired',
    });
  }
}
