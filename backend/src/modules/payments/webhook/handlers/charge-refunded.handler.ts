import { Injectable, Logger } from '@nestjs/common';
import { RefundStatus } from '@prisma/client';
import Stripe from 'stripe';
import {
  IWebhookEventHandler,
  WebhookHandlerResult,
} from '../../interfaces/webhook-handler.interface';
import { PrismaService } from '../../../../common/database/prisma.service';
import { PaymentAuditService } from '../../audit/payment-audit.service';

/** Synchronizes Stripe refunds to the local refund ledger without finalizing bookings. */
@Injectable()
export class ChargeRefundedHandler implements IWebhookEventHandler {
  private readonly logger = new Logger('Handler:ChargeRefunded');
  readonly eventType = 'charge.refunded';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: PaymentAuditService,
  ) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const charge = event.data.object as Stripe.Charge;

    try {
      const paymentIntentId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (!paymentIntentId) {
        return {
          success: true,
          skipped: true,
          message: `Charge ${charge.id} has no payment_intent - cannot link to booking`,
        };
      }

      const payment = await this.prisma.t_trx_payments.findFirst({
        where: {
          OR: [
            { provider_tx_id: paymentIntentId },
            { provider_tx_id: { contains: paymentIntentId } },
          ],
        },
        include: {
          booking: {
            select: { id: true, user_id: true, booking_code: true },
          },
        },
      });
      if (!payment) {
        return {
          success: true,
          skipped: true,
          message: `No payment record found for PI ${paymentIntentId}`,
        };
      }

      const stripeRefunds = charge.refunds?.data ?? [];
      if (stripeRefunds.length === 0) {
        return {
          success: true,
          skipped: true,
          message: `Charge ${charge.id} has no expanded refund records`,
        };
      }

      let synchronized = 0;
      await this.prisma.$transaction(async (tx) => {
        for (const stripeRefund of stripeRefunds) {
          const existing = await tx.t_trx_refunds.findFirst({
            where: {
              OR: [
                { stripe_refund_id: stripeRefund.id },
                {
                  payment_id: payment.id,
                  status: RefundStatus.PROCESSING,
                  stripe_refund_id: null,
                },
              ],
            },
            select: { id: true, stripe_refund_id: true },
            orderBy: { created_at: 'desc' },
          });
          const amount = stripeRefund.amount / 100;
          const percentage = Math.min(
            100,
            Math.max(0, Math.round((amount / Number(payment.amount)) * 100)),
          );

          if (existing) {
            const result = await tx.t_trx_refunds.updateMany({
              where: {
                id: existing.id,
                status: RefundStatus.PROCESSING,
                OR: [{ stripe_refund_id: null }, { stripe_refund_id: stripeRefund.id }],
              },
              data: {
                stripe_refund_id: stripeRefund.id,
                amount,
                currency: stripeRefund.currency.toUpperCase(),
                percentage,
                failure_reason: null,
              },
            });
            synchronized += result.count;
            continue;
          }

          await tx.t_trx_refunds.create({
            data: {
              booking_id: payment.booking_id,
              payment_id: payment.id,
              amount,
              currency: stripeRefund.currency.toUpperCase(),
              percentage,
              reason: stripeRefund.reason ?? 'external_stripe_refund',
              status: RefundStatus.PROCESSING,
              stripe_refund_id: stripeRefund.id,
              requested_by: payment.booking.user_id,
              review_note: 'Synchronized from Stripe charge.refunded',
            },
          });
          synchronized += 1;
        }
      });

      if (synchronized > 0) {
        await this.auditService.record(payment.booking.user_id, 'EXTERNAL_REFUND_SYNCED', {
          payment_id: payment.id,
          booking_code: payment.booking.booking_code,
          charge_id: charge.id,
          refund_ids: stripeRefunds.map((refund) => refund.id),
          source: 'stripe_webhook',
        });
      }

      this.logger.log(`Synchronized ${synchronized} refunds for charge ${charge.id}`);
      return {
        success: true,
        skipped: synchronized === 0,
        message: `Synchronized ${synchronized} refund record(s) for charge ${charge.id}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error processing charge.refunded for ${charge.id}: ${msg}`,
      };
    }
  }
}
