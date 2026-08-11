import { Injectable } from '@nestjs/common';
import { BookingStatus, DisputeStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

const disputeDetailInclude = Prisma.validator<Prisma.t_trx_disputesInclude>()({
  booking: {
    include: {
      event: true,
      tickets: true,
      user: true,
    },
  },
  payment: true,
  documents: true,
});

const openedDisputeInclude = Prisma.validator<Prisma.t_trx_disputesInclude>()({
  booking: {
    select: {
      booking_code: true,
      user_id: true,
    },
  },
});

export type DisputeDetail = Prisma.t_trx_disputesGetPayload<{
  include: typeof disputeDetailInclude;
}>;
export type OpenedDispute = Prisma.t_trx_disputesGetPayload<{
  include: typeof openedDisputeInclude;
}>;

export interface OpenDisputeInput {
  stripe_dispute_id: string;
  paymentId: string;
  amount: Prisma.Decimal | number;
  currency: string;
  reason?: string;
  dueBy?: Date | null;
}

export interface OpenDisputeResult {
  dispute: OpenedDispute;
  created: boolean;
}

@Injectable()
export class DisputesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<DisputeDetail | null> {
    return this.prisma.t_trx_disputes.findUnique({
      where: { id },
      include: disputeDetailInclude,
    });
  }

  findByStripeId(stripeDisputeId: string): Promise<DisputeDetail | null> {
    return this.prisma.t_trx_disputes.findUnique({
      where: { stripe_dispute_id: stripeDisputeId },
      include: disputeDetailInclude,
    });
  }

  findActiveAdminEmails(): Promise<Array<{ email: string }>> {
    return this.prisma.t_mtr_users.findMany({
      where: { role_code: 'ADMIN', is_active: true },
      select: { email: true },
    });
  }

  async list(status: DisputeStatus | undefined, page: number, limit: number) {
    const where: Prisma.t_trx_disputesWhereInput = status ? { status } : {};
    const [total, data] = await this.prisma.$transaction([
      this.prisma.t_trx_disputes.count({ where }),
      this.prisma.t_trx_disputes.findMany({
        where,
        include: {
          booking: { include: { event: true } },
          payment: true,
          documents: true,
        },
        orderBy: { opened_at: 'desc' },
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

  async applyOpened(data: OpenDisputeInput): Promise<OpenDisputeResult> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.t_trx_disputes.findUnique({
        where: { stripe_dispute_id: data.stripe_dispute_id },
        include: openedDisputeInclude,
      });
      if (existing) {
        return { dispute: existing, created: false };
      }

      const payment = await tx.t_trx_payments.findUnique({
        where: { id: data.paymentId },
        select: { id: true, booking_id: true, booking: { select: { user_id: true } } },
      });
      if (!payment) {
        throw new Error('Payment not found');
      }

      const dispute = await tx.t_trx_disputes.create({
        data: {
          stripe_dispute_id: data.stripe_dispute_id,
          payment_id: payment.id,
          booking_id: payment.booking_id,
          amount: data.amount,
          currency: data.currency,
          reason: data.reason,
          evidence_due_by: data.dueBy,
        },
        include: openedDisputeInclude,
      });

      await tx.t_trx_payments.updateMany({
        where: {
          id: payment.id,
          status: { in: [PaymentStatus.COMPLETED, PaymentStatus.DISPUTED] },
        },
        data: { status: PaymentStatus.DISPUTED },
      });
      await tx.t_trx_bookings.updateMany({
        where: {
          id: payment.booking_id,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.DISPUTED] },
        },
        data: {
          status: BookingStatus.DISPUTED,
          cancelled_reason: `Chargeback dispute ${data.stripe_dispute_id}`,
        },
      });
      await tx.t_trx_tickets.updateMany({
        where: { booking_id: payment.booking_id, revoked_at: null },
        data: {
          revoked_at: new Date(),
          revoked_reason: 'PAYMENT_DISPUTED',
          is_checked_in: false,
          checked_in_at: null,
        },
      });
      await tx.t_trx_security_logs.create({
        data: {
          user_id: payment.booking.user_id,
          action: 'DISPUTE_CREATED',
          metadata: {
            dispute_id: dispute.id,
            stripe_dispute_id: data.stripe_dispute_id,
            payment_id: payment.id,
            booking_id: payment.booking_id,
            source: 'stripe_webhook',
          },
        },
      });

      return { dispute, created: true };
    });
  }

  saveEvidence(id: string, data: Prisma.t_trx_disputesUncheckedUpdateInput) {
    return this.prisma.t_trx_disputes.update({
      where: { id },
      data,
      include: { documents: true },
    });
  }

  addDocument(data: Prisma.t_trx_dispute_documentsUncheckedCreateInput) {
    return this.prisma.t_trx_dispute_documents.create({ data });
  }

  async close(id: string, outcome: DisputeStatus) {
    if (outcome !== DisputeStatus.WON && outcome !== DisputeStatus.LOST) {
      throw new Error('Invalid dispute outcome');
    }

    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.t_trx_disputes.findUnique({
        where: { id },
        include: { booking: { select: { user_id: true } } },
      });
      if (!dispute) {
        throw new Error('Dispute not found');
      }
      if (dispute.status === DisputeStatus.WON || dispute.status === DisputeStatus.LOST) {
        return tx.t_trx_disputes.findUniqueOrThrow({
          where: { id },
          include: { booking: true, payment: true },
        });
      }

      const now = new Date();
      if (outcome === DisputeStatus.WON) {
        await tx.t_trx_payments.updateMany({
          where: { id: dispute.payment_id, status: PaymentStatus.DISPUTED },
          data: { status: PaymentStatus.COMPLETED },
        });
        await tx.t_trx_bookings.updateMany({
          where: { id: dispute.booking_id, status: BookingStatus.DISPUTED },
          data: {
            status: BookingStatus.CONFIRMED,
            cancelled_at: null,
            cancelled_reason: null,
          },
        });
        await tx.t_trx_tickets.updateMany({
          where: {
            booking_id: dispute.booking_id,
            revoked_reason: 'PAYMENT_DISPUTED',
          },
          data: { revoked_at: null, revoked_reason: null },
        });
      } else {
        await tx.t_trx_payments.updateMany({
          where: { id: dispute.payment_id, status: PaymentStatus.DISPUTED },
          data: { status: PaymentStatus.REFUNDED },
        });
        await tx.t_trx_bookings.updateMany({
          where: { id: dispute.booking_id, status: BookingStatus.DISPUTED },
          data: {
            status: BookingStatus.CANCELLED,
            cancelled_at: now,
            cancelled_reason: 'CHARGEBACK_LOST',
          },
        });
        await tx.t_mtr_seats.updateMany({
          where: { booking_id: dispute.booking_id },
          data: { booking_id: null, status: 'AVAILABLE' },
        });
      }

      const updated = await tx.t_trx_disputes.update({
        where: { id },
        data: { status: outcome, closed_at: now },
        include: { booking: true, payment: true },
      });
      await tx.t_trx_security_logs.create({
        data: {
          user_id: dispute.booking.user_id,
          action: outcome === DisputeStatus.WON ? 'DISPUTE_WON' : 'DISPUTE_LOST',
          metadata: {
            dispute_id: dispute.id,
            stripe_dispute_id: dispute.stripe_dispute_id,
            payment_id: dispute.payment_id,
            booking_id: dispute.booking_id,
            source: 'stripe_webhook',
          },
        },
      });

      return updated;
    });
  }
}
