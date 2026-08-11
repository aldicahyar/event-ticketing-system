import { Injectable, Logger } from '@nestjs/common';
import { RefundStatus } from '@prisma/client';
import Stripe from 'stripe';
import {
  IWebhookEventHandler,
  WebhookHandlerResult,
} from '../../interfaces/webhook-handler.interface';
import { PrismaService } from '../../../../common/database/prisma.service';
import { NotificationsService } from '../../../notifications/notifications.service';

/** Finalizes asynchronous Stripe refund outcomes. */
@Injectable()
export class RefundUpdatedHandler implements IWebhookEventHandler {
  private readonly logger = new Logger('Handler:RefundUpdated');
  readonly eventType = 'refund.updated';

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const stripeRefund = event.data.object as Stripe.Refund;
    const refundStatus = stripeRefund.status;

    this.logger.log(
      `Refund updated: ${stripeRefund.id} | status=${refundStatus} | amount=${stripeRefund.amount}`,
    );

    try {
      const refund = await this.prisma.t_trx_refunds.findUnique({
        where: { stripe_refund_id: stripeRefund.id },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          booking: {
            select: {
              id: true,
              booking_code: true,
              event: { select: { title: true } },
            },
          },
        },
      });
      if (!refund) {
        return {
          success: true,
          skipped: true,
          message: `No refund record for Stripe refund ${stripeRefund.id}`,
        };
      }

      if (refundStatus === 'succeeded') {
        const completedAt = refund.completed_at ?? new Date();
        const finalized = await this.prisma.$transaction(async (tx) => {
          const updated = await tx.t_trx_refunds.updateMany({
            where: {
              id: refund.id,
              status: { in: [RefundStatus.PROCESSING, RefundStatus.COMPLETED] },
            },
            data: {
              status: RefundStatus.COMPLETED,
              completed_at: completedAt,
              failure_reason: null,
            },
          });
          if (updated.count === 0) return false;

          await tx.t_trx_bookings.updateMany({
            where: {
              id: refund.booking_id,
              status: { in: ['CONFIRMED', 'REFUNDED'] },
            },
            data: {
              status: 'REFUNDED',
              cancelled_at: completedAt,
              cancelled_reason: 'Refund finalized by Stripe webhook',
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
          await tx.t_trx_security_logs.create({
            data: {
              user_id: refund.requested_by,
              action: 'REFUND_SUCCEEDED',
              metadata: {
                refund_id: refund.id,
                stripe_refund_id: stripeRefund.id,
                payment_id: refund.payment_id,
                booking_code: refund.booking.booking_code,
                amount: stripeRefund.amount,
                source: 'stripe_webhook',
              },
            },
          });
          return true;
        });

        if (!finalized) {
          return {
            success: true,
            skipped: true,
            message: `Refund ${stripeRefund.id} cannot be finalized from ${refund.status}`,
          };
        }

        await this.notifications.sendRefundStatus(refund.requester.email, {
          bookingCode: refund.booking.booking_code,
          eventName: refund.booking.event.title,
          customerName: refund.requester.name,
          refundAmount: Number(refund.amount),
          currency: refund.currency,
          status: RefundStatus.COMPLETED,
        });
        return {
          success: true,
          message: `Refund ${stripeRefund.id} finalized atomically`,
        };
      }

      if (refundStatus === 'failed' || refundStatus === 'canceled') {
        const failureReason = stripeRefund.failure_reason ?? refundStatus;
        const failed = await this.prisma.$transaction(async (tx) => {
          const updated = await tx.t_trx_refunds.updateMany({
            where: {
              id: refund.id,
              status: { in: [RefundStatus.PROCESSING, RefundStatus.FAILED] },
            },
            data: {
              status: RefundStatus.FAILED,
              completed_at: null,
              failure_reason: failureReason,
            },
          });
          if (updated.count === 0) return false;

          await tx.t_trx_payments.updateMany({
            where: { id: refund.payment_id, status: 'REFUNDED' },
            data: { status: 'COMPLETED' },
          });
          await tx.t_trx_security_logs.create({
            data: {
              user_id: refund.requested_by,
              action: 'REFUND_FAILED',
              metadata: {
                refund_id: refund.id,
                stripe_refund_id: stripeRefund.id,
                payment_id: refund.payment_id,
                booking_code: refund.booking.booking_code,
                failure_reason: failureReason,
                source: 'stripe_webhook',
              },
            },
          });
          return true;
        });

        if (!failed) {
          return {
            success: true,
            skipped: true,
            message: `Refund ${stripeRefund.id} cannot fail from ${refund.status}`,
          };
        }

        await this.notifications.sendRefundStatus(refund.requester.email, {
          bookingCode: refund.booking.booking_code,
          eventName: refund.booking.event.title,
          customerName: refund.requester.name,
          refundAmount: Number(refund.amount),
          currency: refund.currency,
          status: RefundStatus.FAILED,
          note: failureReason,
        });
        return {
          success: true,
          message: `Refund ${stripeRefund.id} marked FAILED atomically`,
        };
      }

      return {
        success: true,
        skipped: true,
        message: `Refund ${stripeRefund.id} is ${refundStatus} - no action needed`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error processing refund.updated for ${stripeRefund.id}: ${msg}`,
      };
    }
  }
}
