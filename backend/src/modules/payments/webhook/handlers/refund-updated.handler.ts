import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { IWebhookEventHandler, WebhookHandlerResult } from '../../interfaces/webhook-handler.interface';
import { PrismaService } from '../../../../common/database/prisma.service';
import { PaymentAuditService } from '../../audit/payment-audit.service';

/**
 * Handles `refund.updated` — triggered when a refund's status changes
 * (typically: pending → succeeded, or pending → failed).
 *
 * Stripe refunds can be asynchronous — especially for bank transfers
 * or certain card types. This handler ensures the payment record
 * reflects the final refund outcome.
 *
 * Action:
 *   - If refund succeeded: ensure payment status = REFUNDED
 *   - If refund failed: revert payment to COMPLETED, log for investigation
 */
@Injectable()
export class RefundUpdatedHandler implements IWebhookEventHandler {
  private readonly logger = new Logger('Handler:RefundUpdated');
  readonly eventType = 'refund.updated';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: PaymentAuditService,
  ) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const refund = event.data.object as Stripe.Refund;
    const refundStatus = refund.status;

    this.logger.log(
      `Refund updated: ${refund.id} | status=${refundStatus} | amount=${refund.amount}`,
    );

    try {
      // Find the payment record associated with this refund's charge
      const chargeId = typeof refund.charge === 'string' ? refund.charge : refund.charge?.id;
      const paymentIntentId =
        typeof refund.payment_intent === 'string'
          ? refund.payment_intent
          : refund.payment_intent?.id;

      const payment = await this.prisma.t_trx_payments.findFirst({
        where: {
          OR: [
            { provider_tx_id: paymentIntentId ?? 'NO_MATCH' },
            { provider_tx_id: { contains: chargeId ?? 'NO_MATCH' } },
          ],
        },
        include: { booking: { select: { id: true, user_id: true, booking_code: true } } },
      });

      if (!payment) {
        return {
          success: true,
          skipped: true,
          message: `No payment record for refund ${refund.id}`,
        };
      }

      if (refundStatus === 'succeeded') {
        // Ensure payment is marked REFUNDED (may already be from charge.refunded)
        if (payment.status !== 'REFUNDED') {
          await this.prisma.t_trx_payments.update({
            where: { id: payment.id },
            data: { status: 'REFUNDED' },
          });
        }

        await this.auditService.record(
          payment.booking?.user_id ?? 'system',
          'REFUND_SUCCEEDED',
          {
            refund_id: refund.id,
            payment_id: payment.id,
            booking_code: payment.booking?.booking_code,
            amount: refund.amount,
          },
        );

        return {
          success: true,
          message: `Refund ${refund.id} succeeded — payment ${payment.id} confirmed REFUNDED`,
        };
      }

      if (refundStatus === 'failed' || refundStatus === 'canceled') {
        // Refund failed — revert payment to its previous status
        this.logger.error(
          `Refund ${refund.id} failed/canceled — payment ${payment.id} remains COMPLETED`,
        );

        if (payment.status === 'REFUNDED') {
          await this.prisma.t_trx_payments.update({
            where: { id: payment.id },
            data: { status: 'COMPLETED' },
          });
        }

        await this.auditService.record(
          payment.booking?.user_id ?? 'system',
          'REFUND_FAILED',
          {
            refund_id: refund.id,
            payment_id: payment.id,
            booking_code: payment.booking?.booking_code,
            failure_reason: refund.failure_reason,
          },
        );

        return {
          success: true,
          message: `Refund ${refund.id} ${refundStatus} — payment reverted to COMPLETED`,
        };
      }

      // Pending or other status — no action needed
      return {
        success: true,
        skipped: true,
        message: `Refund ${refund.id} is ${refundStatus} — no action needed`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error processing refund.updated for ${refund.id}: ${msg}`,
      };
    }
  }
}
