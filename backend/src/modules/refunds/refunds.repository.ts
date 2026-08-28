import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, RefundStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { DEFAULT_REFUND_POLICIES } from './refunds.constants';

const refundInclude = {
  booking: {
    select: {
      id: true,
      booking_code: true,
      total_price: true,
      currency: true,
      cancelled_at: true,
      event: {
        select: { id: true, title: true, status: true, start_date_time: true, organizer_id: true },
      },
      payment: { select: { id: true, status: true, provider_tx_id: true } },
      seats: { select: { id: true, row: true, number: true, type: true }, orderBy: { row: 'asc' } },
    },
  },
  requester: { select: { id: true, name: true, email: true } },
  reviewer: { select: { id: true, name: true, email: true } },
} satisfies Prisma.t_trx_refundsInclude;

export type RefundWithRelations = Prisma.t_trx_refundsGetPayload<{
  include: typeof refundInclude;
}>;

@Injectable()
export class RefundsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizerId?: string) {
    return this.prisma.t_trx_refunds.findFirst({
      where: {
        id,
        ...(organizerId ? { booking: { event: { organizer_id: organizerId } } } : {}),
      },
      include: refundInclude,
    });
  }

  findActiveByBooking(bookingId: string) {
    return this.prisma.t_trx_refunds.findFirst({
      where: {
        booking_id: bookingId,
        status: { in: [RefundStatus.REQUESTED, RefundStatus.PROCESSING, RefundStatus.COMPLETED] },
      },
    });
  }

  findByStripeRefundId(stripeRefundId: string) {
    return this.prisma.t_trx_refunds.findUnique({ where: { stripe_refund_id: stripeRefundId } });
  }

  findMine(userId: string) {
    return this.prisma.t_trx_refunds.findMany({
      where: { requested_by: userId },
      include: refundInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  async findAll(
    status: RefundStatus | undefined,
    page: number,
    limit: number,
    organizerId?: string,
  ) {
    const where: Prisma.t_trx_refundsWhereInput = {
      ...(status ? { status } : {}),
      ...(organizerId ? { booking: { event: { organizer_id: organizerId } } } : {}),
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.t_trx_refunds.count({ where }),
      this.prisma.t_trx_refunds.findMany({
        where,
        include: refundInclude,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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

  /**
   * Creates a refund request. The DB enforces a partial unique index on
   * (booking_id) WHERE status IN (REQUESTED, PROCESSING, COMPLETED), so a
   * concurrent request that loses the race fails here instead of producing a
   * duplicate active refund.
   */
  async create(data: Prisma.t_trx_refundsUncheckedCreateInput) {
    try {
      return await this.prisma.t_trx_refunds.create({ data, include: refundInclude });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('An active refund request already exists for this booking');
      }
      throw err;
    }
  }

  update(id: string, data: Prisma.t_trx_refundsUncheckedUpdateInput) {
    return this.prisma.t_trx_refunds.update({ where: { id }, data, include: refundInclude });
  }

  async finalizeRefund(refundId: string, stripeRefundId: string, completedReason: string) {
    const completedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const refund = await tx.t_trx_refunds.findUnique({
        where: { id: refundId },
        select: {
          id: true,
          booking_id: true,
          payment_id: true,
          status: true,
          completed_at: true,
        },
      });
      if (!refund) throw new Error(`Refund ${refundId} not found during finalization`);
      if (refund.status !== RefundStatus.PROCESSING && refund.status !== RefundStatus.COMPLETED) {
        throw new Error(`Refund ${refundId} cannot be finalized from status ${refund.status}`);
      }

      await tx.t_trx_refunds.updateMany({
        where: { id: refundId, status: { in: [RefundStatus.PROCESSING, RefundStatus.COMPLETED] } },
        data: {
          stripe_refund_id: stripeRefundId,
          status: RefundStatus.COMPLETED,
          completed_at: refund.completed_at ?? completedAt,
          failure_reason: null,
        },
      });
      await tx.t_trx_bookings.updateMany({
        where: { id: refund.booking_id, status: { in: ['CONFIRMED', 'REFUNDED'] } },
        data: {
          status: 'REFUNDED',
          cancelled_at: completedAt,
          cancelled_reason: completedReason,
        },
      });
      await tx.t_trx_payments.updateMany({
        where: { id: refund.payment_id },
        data: { status: 'REFUNDED' },
      });
      await tx.t_mtr_seats.updateMany({
        where: { booking_id: refund.booking_id },
        data: { booking_id: null, status: 'AVAILABLE' },
      });
      await tx.t_trx_tickets.deleteMany({
        where: { booking_id: refund.booking_id },
      });
    });
    return this.findById(refundId);
  }

  async markFailed(refundId: string, failureReason: string) {
    await this.prisma.t_trx_refunds.updateMany({
      where: { id: refundId, status: { in: [RefundStatus.PROCESSING, RefundStatus.FAILED] } },
      data: { status: RefundStatus.FAILED, failure_reason: failureReason },
    });
    return this.findById(refundId);
  }

  findForWebhook(stripeRefundId: string, paymentId?: string) {
    return this.prisma.t_trx_refunds.findFirst({
      where: {
        OR: [
          { stripe_refund_id: stripeRefundId },
          ...(paymentId ? [{ payment_id: paymentId, status: RefundStatus.PROCESSING }] : []),
        ],
      },
      include: refundInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  findBookingForRefund(bookingId: string) {
    return this.prisma.t_trx_bookings.findUnique({
      where: { id: bookingId },
      include: {
        event: true,
        payment: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async listPolicies() {
    await this.ensureDefaultPolicies();
    return this.prisma.t_trx_refund_policies.findMany({
      include: { updater: { select: { id: true, name: true, email: true } } },
      orderBy: { priority: 'asc' },
    });
  }

  async ensureDefaultPolicies(): Promise<void> {
    await Promise.all(
      DEFAULT_REFUND_POLICIES.map((policy) =>
        this.prisma.t_trx_refund_policies.upsert({
          where: { rule_code: policy.rule_code },
          update: {},
          create: policy,
        }),
      ),
    );
  }

  findPolicy(ruleCode: string) {
    return this.prisma.t_trx_refund_policies.findUnique({ where: { rule_code: ruleCode } });
  }

  updatePolicy(ruleCode: string, data: Prisma.t_trx_refund_policiesUncheckedUpdateInput) {
    return this.prisma.t_trx_refund_policies.update({ where: { rule_code: ruleCode }, data });
  }

  createPolicyAudit(data: Prisma.t_trx_refund_policy_audit_logsUncheckedCreateInput) {
    return this.prisma.t_trx_refund_policy_audit_logs.create({ data });
  }

  listPolicyAudit() {
    return this.prisma.t_trx_refund_policy_audit_logs.findMany({
      include: { policy: true, author: { select: { id: true, name: true, email: true } } },
      orderBy: { changed_at: 'desc' },
    });
  }
}
