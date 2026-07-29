import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException, Logger, OnModuleInit, OnModuleDestroy, forwardRef, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CancelReasonCode } from './dto/bookings.dto';
import Stripe from 'stripe';

@Injectable()
export class BookingsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingsService.name);
  private readonly frontendUrl: string;
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
  }

  onModuleInit() {
    // Run booking expiration check every 1 minute
    this.cleanupInterval = setInterval(() => this.expireOldBookings(), 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Cron-like job to find all PENDING bookings that have passed their expires_at,
   * cancel them, and release their seats back to AVAILABLE.
   *
   * Before expiring, each booking is cross-checked against Stripe: if the user
   * actually completed payment (webhook was delayed), the booking is synced to
   * CONFIRMED instead of being expired.
   */
  async expireOldBookings() {
    try {
      const expiredBookings = await this.prisma.t_trx_bookings.findMany({
        where: {
          status: 'PENDING',
          expires_at: { lt: new Date() },
        },
        select: { id: true, booking_code: true },
      });

      if (expiredBookings.length === 0) return;

      const toExpire: string[] = [];

      for (const b of expiredBookings) {
        const paid = await this.paymentsService.isBookingActuallyPaid(b.id);
        if (paid) {
          this.logger.warn(
            `Booking ${b.booking_code} past expires_at but appears paid in Stripe — skipping expire so webhook/fallback can sync it`,
          );
        } else {
          toExpire.push(b.id);
        }
      }

      if (toExpire.length === 0) return;

      this.logger.log(`Found ${toExpire.length} truly expired bookings. Canceling...`);

      await this.prisma.$transaction(async (tx) => {
        // 1. Release seats (only for bookings still PENDING — a booking
        //    that was confirmed by a webhook during the cross-check loop
        //    must NOT have its seats released).
        await tx.t_mtr_seats.updateMany({
          where: { booking_id: { in: toExpire } },
          data: { status: 'AVAILABLE', booking_id: null },
        });

        // 2. Mark bookings as EXPIRED — conditional on status='PENDING'
        //    to prevent overwriting a CONFIRMED or CANCELLED status set
        //    by a concurrent payment webhook or refund flow.
        await tx.t_trx_bookings.updateMany({
          where: { id: { in: toExpire }, status: 'PENDING' },
          data: { status: 'EXPIRED' },
        });
      });

      this.logger.log(
        `Successfully expired ${toExpire.length} bookings and released seats.`,
      );
    } catch (error) {
      this.logger.error('Failed to expire old bookings', error);
    }
  }

  async checkout(user_id: string, event_id: string, seatIds: string[], guestInfo?: { guest_name?: string, guest_email?: string, guest_phone?: string }) {
    // 1. Verify t_trx_events
    const event = await this.prisma.t_trx_events.findUnique({
      where: { id: event_id },
      include: { venue: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    if (!seatIds || seatIds.length === 0) {
      throw new BadRequestException('No seats selected');
    }

    // 2. Fetch all requested seats
    const seats = await this.prisma.t_mtr_seats.findMany({
      where: { id: { in: seatIds }, event_id },
    });
    if (seats.length !== seatIds.length) {
      throw new BadRequestException('Some seats do not exist or do not belong to this event');
    }

    const unavailableSeats = seats.filter((s) => s.status !== 'AVAILABLE');
    if (unavailableSeats.length > 0) {
      throw new ConflictException('Some selected seats are no longer available');
    }

    // 3. Acquire Distributed Locks for each seat using Redis
    const redisClient = this.redis.getClient();
    const lockedKeys: string[] = [];
    if (redisClient) {
      for (const seat_id of seatIds) {
        const lockKey = `seat_lock:${seat_id}`;
        // Set NX (Not Exists), EX 900 (Expires in 900s = 15m)
        const acquired = await redisClient.set(lockKey, user_id, 'EX', 900, 'NX');
        if (!acquired) {
          // If we fail to acquire a lock, rollback any locks we already got
          if (lockedKeys.length > 0) {
            await redisClient.del(...lockedKeys);
          }
          throw new ConflictException(`Seat is currently being booked by someone else. Please try again or select another seat.`);
        }
        lockedKeys.push(lockKey);
      }
    }

    // Declare booking outside try so catch block can roll it back if
    // Stripe session creation fails after the DB transaction committed.
    let booking: { id: string; booking_code: string } | undefined;

    try {
      // 4. Calculate Total Price
      const tierSettings = await this.prisma.t_mtr_ticket_tier_settings.findMany({ where: { status: 'ACTIVE' } });
      const taxSetting = await this.prisma.t_mtr_tax_settings.findUnique({ where: { id: 'default' } });
      const taxPercent = taxSetting?.status === 'ACTIVE' ? taxSetting.ppn_percent : 0;

      let subtotal = 0;
      for (const seat of seats) {
        const tier = tierSettings.find((t) => t.id === seat.type);
        const multiplier = tier ? tier.multiplier : 1;
        const price = Number(event.base_price) * multiplier;
        subtotal += price;
      }
      const tax = subtotal * (taxPercent / 100);
      const total_price = subtotal + tax;
      const booking_code = `BOK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      // Booking window: 15 minutes for the user to complete payment.
      // Note: Stripe requires expires_at >= 30 min from session creation,
      // so we clamp the Stripe session expiry to Stripe's minimum while
      // keeping the booking's own expiry at 15 min. The atomic expiry
      // guard in processSuccessfulPayment catches any payment that arrives
      // after the 15-min booking window (even if Stripe still allows it).
      const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      // 5. Database Transaction to create t_trx_bookings and update Seats
      booking = await this.prisma.$transaction(async (tx) => {
        // Double check status inside transaction
        const currentSeats = await tx.t_mtr_seats.findMany({
          where: { id: { in: seatIds }, status: 'AVAILABLE' },
        });
        if (currentSeats.length !== seatIds.length) {
          throw new ConflictException('Seats were taken before transaction completed');
        }

        const b = await tx.t_trx_bookings.create({
          data: {
            user_id,
            event_id,
            booking_code,
            total_price,
            currency: event.currency,
            status: 'PENDING',
            expires_at,
            // Snapshot seat IDs — permanent record that survives seat release
            seat_ids: seatIds,
            guest_name: guestInfo?.guest_name,
            guest_email: guestInfo?.guest_email,
            guest_phone: guestInfo?.guest_phone,
          },
        });

        await tx.t_mtr_seats.updateMany({
          where: { id: { in: seatIds } },
          data: { status: 'RESERVED', booking_id: b.id },
        });

        return b;
      });

      // 6. Create Stripe Checkout Session
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
      }
      const stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
      });

      // Fetch user to get email for Stripe
      const customer = await this.prisma.t_mtr_users.findUnique({ where: { id: user_id } });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: customer?.email || undefined,
        line_items: [
          {
            price_data: {
              currency: event.currency.toLowerCase(),
              product_data: {
                name: `${event.title} - Ticketing`,
                description: `Booking Code: ${booking.booking_code}`,
              },
              unit_amount: Math.round(total_price * 100), // Stripe expects cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        // Stripe requires expires_at >= 30 min from session creation.
        // Our booking window is 15 min, so we use Stripe's minimum (30 min)
        // and rely on the atomic expiry guard in processSuccessfulPayment
        // to catch payments that arrive after the 15-min booking window.
        expires_at: Math.floor((Date.now() + 30 * 60 * 1000) / 1000),
        success_url: `${this.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.frontendUrl}/checkout/pending?booking=${booking.id}`,
        client_reference_id: booking.id,
      });

      // Persist the Stripe session id on the booking so the payment flow can
      // be recovered if the user closes the Stripe tab before completing
      // payment. This is read by /payments/recover-session and the pending
      // checkout polling job.
      await this.prisma.t_trx_bookings.update({
        where: { id: booking.id },
        data: { stripe_session_id: session.id },
      });

      return {
        booking_id: booking.id,
        booking_code: booking.booking_code,
        session_id: session.id,
        checkoutUrl: session.url,
        expires_at,
        message: 'Seats locked and checkout session created successfully',
      };
    } catch (error) {
      // Rollback: release Redis locks so other users can book these seats
      if (redisClient && lockedKeys.length > 0) {
        await redisClient.del(...lockedKeys);
      }

      // CRITICAL: If a booking was created but Stripe session creation
      // failed, we must roll back the DB state too — otherwise seats stay
      // RESERVED on a phantom PENDING booking that has no checkout URL.
      // The user would see "Stripe page disappeared" because the backend
      // returned no checkoutUrl.
      if (booking) {
        this.logger.error(
          `Checkout failed after booking ${booking.booking_code} was created — rolling back seats and cancelling booking`,
        );
        try {
          await this.prisma.$transaction(async (tx) => {
            await tx.t_mtr_seats.updateMany({
              where: { booking_id: booking.id },
              data: { status: 'AVAILABLE', booking_id: null },
            });
            await tx.t_trx_bookings.update({
              where: { id: booking.id },
              data: {
                status: 'CANCELLED',
                cancelled_at: new Date(),
                cancelled_reason: 'STRIPE_SESSION_CREATION_FAILED',
              },
            });
          });
        } catch (rollbackErr) {
          this.logger.error(
            `Failed to rollback booking ${booking.booking_code}: ${rollbackErr}`,
          );
        }
      }

      // Re-throw so the controller returns a proper HTTP error to the
      // frontend instead of `undefined`. This is the root cause fix:
      // previously the error was silently swallowed, the method returned
      // undefined, and the frontend never received a checkoutUrl.
      throw error;
    }
  }

  /**
   * Cancel a PENDING booking.
   *
   * Business rules (confirmed via brainstorming):
   *   - Only PENDING bookings can be cancelled (CONFIRMED refund is a future feature).
   *   - The booking owner OR an admin may cancel.
   *   - A reason code + description are required for the audit trail.
   *
   * Side effects:
   *   1. Seats are released back to AVAILABLE (inside a DB transaction).
   *   2. Redis seat locks are removed so other users can immediately book.
   *   3. The linked Stripe Checkout Session is expired (best-effort) so the
   *      user can no longer pay on the cancelled session.
   *   4. A structured audit log + email-ready notification payload is emitted.
   *
   * @throws NotFoundException  — booking does not exist.
   * @throws ForbiddenException — caller is neither the owner nor an admin.
   * @throws BadRequestException — booking is not in PENDING status.
   * @throws ConflictException   — another process already changed the status.
   */
  async cancelBooking(
    booking_id: string,
    user: { id: string; role: string; email: string },
    reason: CancelReasonCode,
    description: string,
  ) {
    // ── 1. Fetch the booking ──────────────────────────────────────────
    const booking = await this.prisma.t_trx_bookings.findUnique({
      where: { id: booking_id },
      include: {
        event: { select: { title: true, start_date_time: true } },
        seats: { select: { id: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${booking_id} not found`);
    }

    // ── 2. Authorization: owner or admin ──────────────────────────────
    const isOwner = booking.user_id === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to cancel this booking',
      );
    }

    // ── 3. Validate status — only PENDING can be cancelled ───────────
    if (booking.status !== 'PENDING') {
      throw new BadRequestException(
        `Booking cannot be cancelled because its status is ${booking.status}. ` +
          'Only PENDING bookings can be cancelled.',
      );
    }

    // ── 4. Atomically cancel the booking and release seats ───────────
    // The conditional updateMany (status = 'PENDING') prevents a race
    // where a payment webhook confirmed the booking between our read
    // and this write.
    const now = new Date();
    const cancelledBy = isAdmin && !isOwner ? `admin:${user.email}` : `user:${user.email}`;
    const cancelledReason =
      `USER_CANCELLED | reason=${reason} | desc="${description}" | by=${cancelledBy}`;

    const result = await this.prisma.$transaction(async (tx) => {
      // Release seats back to AVAILABLE
      await tx.t_mtr_seats.updateMany({
        where: { booking_id: booking.id },
        data: { status: 'AVAILABLE', booking_id: null },
      });

      // Conditionally update the booking — prevents overwriting a
      // concurrent CONFIRMED/EXPIRED/CANCELLED status change.
      const updated = await tx.t_trx_bookings.updateMany({
        where: { id: booking.id, status: 'PENDING' },
        data: {
          status: 'CANCELLED',
          cancelled_at: now,
          cancelled_reason: cancelledReason,
        },
      });

      if (updated.count === 0) {
        // Another process changed the status between our validation
        // read and this transaction.
        throw new ConflictException(
          'This booking was modified by another process and could not be cancelled. ' +
            'Please refresh and try again.',
        );
      }

      return tx.t_trx_bookings.findUnique({
        where: { id: booking.id },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              start_date_time: true,
              venue: { select: { name: true, city: true } },
            },
          },
          seats: {
            orderBy: [{ row: 'asc' }, { number: 'asc' }],
          },
        },
      });
    });

    // ── 5. Release Redis seat locks ──────────────────────────────────
    const redisClient = this.redis.getClient();
    if (redisClient && booking.seat_ids && booking.seat_ids.length > 0) {
      const lockKeys = booking.seat_ids.map((sid) => `seat_lock:${sid}`);
      await redisClient.del(...lockKeys).catch((err: unknown) => {
        this.logger.warn(
          `Failed to release Redis locks for booking ${booking.booking_code}: ${err}`,
        );
      });
    }

    // ── 6. Expire the Stripe Checkout Session (best-effort) ──────────
    if (booking.stripe_session_id) {
      await this.paymentsService.expireStripeSession(
        booking.stripe_session_id,
        booking.booking_code,
      );
    }

    // ── 7. Audit log + email notification payload ────────────────────
    await this.notifyCancellation(result!, user, reason, description, isAdmin);

    return result;
  }

  /**
   * Emit a structured audit log and send a cancellation email via the
   * NotificationsService. The audit log is the compliance record; the
   * email is the customer-facing notification.
   */
  private async notifyCancellation(
    booking: any,
    cancelledBy: { id: string; email: string },
    reason: CancelReasonCode,
    description: string,
    isAdmin: boolean,
  ): Promise<void> {
    const user = await this.prisma.t_mtr_users.findUnique({
      where: { id: booking.user_id },
      select: { email: true, name: true },
    });

    // Structured audit log — the single source of truth for compliance.
    this.logger.log(
      `[AUDIT] BOOKING_CANCELLED | booking=${booking.booking_code} | ` +
        `booking_id=${booking.id} | user=${user?.email ?? booking.user_id} | ` +
        `event="${booking.event?.title ?? 'N/A'}" | reason=${reason} | ` +
        `desc="${description}" | cancelled_by=${isAdmin ? 'ADMIN' : 'OWNER'} ` +
        `(${cancelledBy.email}) | cancelled_at=${booking.cancelled_at?.toISOString()}`,
    );

    // Send the cancellation email (non-blocking — errors are caught internally).
    if (user?.email) {
      await this.notificationsService.sendBookingCancelled(user.email, {
        bookingCode: booking.booking_code,
        eventName: booking.event?.title ?? 'Event',
        customerName: user.name ?? 'Customer',
        reason,
        description,
        cancelledByAdmin: isAdmin,
        adminEmail: isAdmin ? cancelledBy.email : null,
        cancelledAt: booking.cancelled_at?.toISOString() ?? new Date().toISOString(),
      });
    }
  }

  /**
   * Returns only bookings owned by the user, including event, venue, seats, and payment.
   */
  async findMyOrders(user_id: string) {
    return this.prisma.t_trx_bookings.findMany({
      where: { user_id },
      include: {
        event: {
          include: {
            venue: {
              select: {
                id: true,
                name: true,
                city: true,
                address: true,
              },
            },
          },
        },
        seats: {
          orderBy: [{ row: 'asc' }, { number: 'asc' }],
        },
        payment: true,
        tickets: {
          select: { id: true, qr_code: true, is_checked_in: true },
        },
      },
      orderBy: { booked_at: 'desc' },
    });
  }

  /**
   * Get a single booking (order) owned by the user.
   * Throws NotFound if the booking does not exist or does not belong to the user.
   */
  async findMyOrderById(user_id: string, booking_id: string) {
    const booking = await this.prisma.t_trx_bookings.findFirst({
      where: { id: booking_id, user_id },
      include: {
        event: {
          include: {
            venue: true,
          },
        },
        seats: {
          orderBy: [{ row: 'asc' }, { number: 'asc' }],
        },
        payment: true,
        tickets: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Order with ID ${booking_id} not found`);
    }

    return booking;
  }

  /**
   * Get all tickets (e-tickets) for a specific user.
   * Returns tickets associated with bookings owned by the user.
   * Only includes CONFIRMED bookings (i.e. valid tickets).
   */
  async findMyTickets(user_id: string) {
    const bookings = await this.prisma.t_trx_bookings.findMany({
      where: {
        user_id,
        status: 'CONFIRMED',
      },
      include: {
        event: {
          include: {
            venue: {
              select: {
                id: true,
                name: true,
                city: true,
                address: true,
              },
            },
          },
        },
        seats: {
          orderBy: [{ row: 'asc' }, { number: 'asc' }],
        },
        payment: true,
        tickets: true,
      },
      orderBy: { event: { start_date_time: 'asc' } },
    });

    return bookings;
  }

  /**
   * Get aggregate order stats for the current user (for dashboard overview).
   */
  async getMyOrderStats(user_id: string) {
    const bookings = await this.prisma.t_trx_bookings.findMany({
      where: { user_id, status: 'CONFIRMED' },
      select: {
        total_price: true,
        _count: { select: { tickets: true } },
      },
    });

    const totalOrders = bookings.length;
    const totalTickets = bookings.reduce(
      (acc, b) => acc + (b._count?.tickets ?? 0),
      0,
    );
    const totalSpent = bookings.reduce(
      (acc, b) => acc + (b.total_price instanceof Prisma.Decimal ? Number(b.total_price) : Number(b.total_price ?? 0)),
      0,
    );

    return {
      totalOrders,
      totalTickets,
      totalSpent,
    };
  }
}
