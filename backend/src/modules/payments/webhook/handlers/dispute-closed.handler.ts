import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { IWebhookEventHandler, WebhookHandlerResult } from '../../interfaces/webhook-handler.interface';
import { PrismaService } from '../../../../common/database/prisma.service';
import { PaymentAuditService } from '../../audit/payment-audit.service';

/**
 * Handles `charge.dispute.closed` — triggered when a dispute is resolved.
 *
 * Outcomes:
 *   - `won`: The merchant wins the dispute. Funds are returned.
 *     Action: Restore booking to CONFIRMED, reactivate tickets.
 *   - `lost`: The customer wins. Funds stay with the customer.
 *     Action: Booking stays CANCELLED, payment stays DISPUTED.
 *
 * This handler ensures the database reflects the final state of the
 * dispute for accurate reporting and reconciliation.
 */
@Injectable()
export class DisputeClosedHandler implements IWebhookEventHandler {
  private readonly logger = new Logger('Handler:DisputeClosed');
  readonly eventType = 'charge.dispute.closed';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: PaymentAuditService,
  ) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const dispute = event.data.object as Stripe.Dispute;
    const outcome = dispute.status;

    this.logger.log(
      `Dispute closed: ${dispute.id} | status=${outcome} | reason=${dispute.reason}`,
    );

    try {
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
      const paymentIntentId =
        typeof dispute.payment_intent === 'string'
          ? dispute.payment_intent
          : dispute.payment_intent?.id;

      const payment = await this.prisma.t_trx_payments.findFirst({
        where: {
          OR: [
            { provider_tx_id: paymentIntentId ?? 'NO_MATCH' },
            { provider_tx_id: { contains: chargeId ?? 'NO_MATCH' } },
          ],
        },
        include: { booking: { select: { id: true, user_id: true, booking_code: true, status: true } } },
      });

      if (!payment) {
        return {
          success: true,
          skipped: true,
          message: `Dispute ${dispute.id} closed: no matching payment record`,
        };
      }

      if (outcome === 'won') {
        // Merchant won — restore payment and booking
        await this.prisma.t_trx_payments.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' },
        });

        if (payment.booking) {
          await this.prisma.t_trx_bookings.update({
            where: { id: payment.booking.id },
            data: {
              status: 'CONFIRMED',
              cancelled_reason: null,
            },
          });
        }

        await this.auditService.record(
          payment.booking?.user_id ?? 'system',
          'DISPUTE_WON',
          {
            dispute_id: dispute.id,
            payment_id: payment.id,
            booking_code: payment.booking?.booking_code,
            amount: dispute.amount,
          },
        );

        return {
          success: true,
          message: `Dispute ${dispute.id} WON — booking ${payment.booking?.booking_code ?? 'unknown'} restored to CONFIRMED`,
        };
      }

      // Dispute lost or expired — finalize as cancelled
      await this.prisma.t_trx_payments.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      });

      await this.auditService.record(
        payment.booking?.user_id ?? 'system',
        'DISPUTE_LOST',
        {
          dispute_id: dispute.id,
          payment_id: payment.id,
          booking_code: payment.booking?.booking_code,
          outcome: outcome,
          amount: dispute.amount,
        },
      );

      return {
        success: true,
        message: `Dispute ${dispute.id} closed (${outcome}) — finalized as lost`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error processing dispute.closed for ${dispute.id}: ${msg}`,
      };
    }
  }
}
