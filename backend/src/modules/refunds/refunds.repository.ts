import { Injectable } from '@nestjs/common';
import { Prisma, RefundStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { DEFAULT_REFUND_POLICIES } from './refunds.constants';

const refundInclude = {
  booking: {
    include: {
      event: { select: { id: true, title: true, status: true, start_date_time: true, organizer_id: true } },
      payment: true,
    },
  },
  requester: { select: { id: true, name: true, email: true } },
  reviewer: { select: { id: true, name: true, email: true } },
} satisfies Prisma.t_trx_refundsInclude;

@Injectable()
export class RefundsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.t_trx_refunds.findUnique({ where: { id }, include: refundInclude });
  }

  findActiveByBooking(bookingId: string) {
    return this.prisma.t_trx_refunds.findFirst({
      where: { booking_id: bookingId, status: { in: [RefundStatus.REQUESTED, RefundStatus.PROCESSING, RefundStatus.COMPLETED] } },
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

  findAll(status?: RefundStatus, organizerId?: string) {
    return this.prisma.t_trx_refunds.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(organizerId ? { booking: { event: { organizer_id: organizerId } } } : {}),
      },
      include: refundInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  create(data: Prisma.t_trx_refundsUncheckedCreateInput) {
    return this.prisma.t_trx_refunds.create({ data, include: refundInclude });
  }

  update(id: string, data: Prisma.t_trx_refundsUncheckedUpdateInput) {
    return this.prisma.t_trx_refunds.update({ where: { id }, data, include: refundInclude });
  }

  /**
   * Defense in depth: after a refund succeeds, sync the dependent records
   * (booking → REFUNDED, seats → AVAILABLE, tickets deleted, payment →
   * REFUNDED). The Stripe `charge.refunded` webhook normally does this;
   * this covers the case where the webhook is missed/delayed. All writes
   * are idempotent.
   */
  async finalizeRefundedBooking(bookingId: string, paymentId?: string | null) {
    await this.prisma.$transaction([
      this.prisma.t_trx_bookings.updateMany({
        where: { id: bookingId, status: 'CONFIRMED' },
        data: {
          status: 'REFUNDED',
          cancelled_at: new Date(),
          cancelled_reason: 'Refunded via admin/organizer approval',
        },
      }),
      this.prisma.t_mtr_seats.updateMany({
        where: { booking_id: bookingId },
        data: { booking_id: null, status: 'AVAILABLE' },
      }),
      this.prisma.t_trx_tickets.deleteMany({
        where: { booking_id: bookingId },
      }),
      ...(paymentId
        ? [
            this.prisma.t_trx_payments.updateMany({
              where: { id: paymentId },
              data: { status: 'REFUNDED' },
            }),
          ]
        : []),
    ]);
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
