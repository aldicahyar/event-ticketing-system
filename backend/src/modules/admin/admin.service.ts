import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type Stripe from 'stripe';
import { PrismaService } from '../../common/database/prisma.service';
import { StripeService } from '../../common/stripe/stripe.service';
import { RefundActor, RefundsService } from '../refunds/refunds.service';
import { QueryActivityDto, QueryAdminPaymentDto } from './dto/admin.dto';

/** Stripe minor-units → main-units (DB stores IDR main units). */
const MINOR = 100;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly refunds: RefundsService,
  ) {}

  // ── Payments cockpit ───────────────────────────────────────────
  async listPayments(query: QueryAdminPaymentDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.t_trx_paymentsWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.event_id ? { booking: { event_id: query.event_id } } : {}),
      ...this.createdAtRange(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { booking: { booking_code: { contains: query.search, mode: 'insensitive' } } },
              { provider_tx_id: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.t_trx_payments.count({ where }),
      this.prisma.t_trx_payments.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          amount: true,
          currency: true,
          provider: true,
          provider_tx_id: true,
          status: true,
          paid_at: true,
          created_at: true,
          booking: {
            select: {
              id: true,
              booking_code: true,
              status: true,
              user: { select: { id: true, name: true, email: true } },
              event: { select: { id: true, title: true } },
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async paymentDetail(id: string) {
    const payment = await this.prisma.t_trx_payments.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            booking_code: true,
            status: true,
            total_price: true,
            user: { select: { id: true, name: true, email: true } },
            event: { select: { id: true, title: true } },
          },
        },
        refunds: {
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            status: true,
            amount: true,
            percentage: true,
            reason: true,
            stripe_refund_id: true,
            created_at: true,
            completed_at: true,
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    return { ...payment, stripe: await this.stripeSnapshot(payment.provider_tx_id) };
  }

  /** Live PaymentIntent view: status, method, fee, charge-level refunds. */
  private async stripeSnapshot(providerTxId: string | null) {
    if (!providerTxId) return null;
    try {
      let intentId = providerTxId;
      if (providerTxId.startsWith('cs_')) {
        const session = await this.stripe.retrieveCheckoutSession(providerTxId);
        const pi = session.payment_intent;
        intentId = typeof pi === 'string' ? pi : ((pi as Stripe.PaymentIntent | null)?.id ?? '');
      }
      if (!intentId.startsWith('pi_')) return { unavailable: true, reason: 'No payment intent' };

      const intent = await this.stripe.client.paymentIntents.retrieve(intentId, {
        expand: ['latest_charge.balance_transaction'],
      });
      const charge = intent.latest_charge as Stripe.Charge | null;
      const balanceTx = charge?.balance_transaction as Stripe.BalanceTransaction | null;
      return {
        payment_intent_id: intent.id,
        status: intent.status,
        payment_method_types: intent.payment_method_types,
        amount: intent.amount / MINOR,
        amount_refunded: (charge?.amount_refunded ?? 0) / MINOR,
        fee: balanceTx ? balanceTx.fee / MINOR : null,
        net: balanceTx ? balanceTx.net / MINOR : null,
        receipt_url: charge?.receipt_url ?? null,
      };
    } catch (err) {
      this.logger.warn(`Stripe snapshot failed for ${providerTxId}: ${String(err)}`);
      return { unavailable: true, reason: 'Stripe lookup failed' };
    }
  }

  async refundPayment(id: string, admin: RefundActor, note: string) {
    const payment = await this.prisma.t_trx_payments.findUnique({
      where: { id },
      select: { booking_id: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.refunds.adminRefund(payment.booking_id, admin, note);
  }

  // ── Activity feed ──────────────────────────────────────────────
  async activity(query: QueryActivityDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    // Default window: last 30 days when no explicit range given.
    const from = query.from ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const where: Prisma.t_trx_activity_logWhereInput = {
      ...(query.model ? { model: query.model } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.target_id ? { target_id: query.target_id } : {}),
      ...(query.actor_id ? { actor_id: query.actor_id } : {}),
      ...this.createdAtRange(from, query.to),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.t_trx_activity_log.count({ where }),
      this.prisma.t_trx_activity_log.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Resolve actor names in one query (actor_id is not an FK).
    const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
    const actors = actorIds.length
      ? await this.prisma.t_mtr_users.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    return {
      data: rows.map((r) => ({
        ...r,
        actor: r.actor_id ? (actorMap.get(r.actor_id) ?? null) : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /** Builds an inclusive created_at filter; `to` is treated as end-of-day. */
  private createdAtRange(from?: string, to?: string): { created_at?: Prisma.DateTimeFilter } {
    if (!from && !to) return {};
    return {
      created_at: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
      },
    };
  }
}
