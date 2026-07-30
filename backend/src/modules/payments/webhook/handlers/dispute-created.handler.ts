import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { IWebhookEventHandler, WebhookHandlerResult } from '../../interfaces/webhook-handler.interface';
import { PrismaService } from '../../../../common/database/prisma.service';
import { PaymentAuditService } from '../../audit/payment-audit.service';

/**
 * Handles `charge.dispute.created` — triggered when a customer
 * initiates a chargeback through their bank.
 *
 * This is a critical financial event. The merchant's account is
 * debited immediately, and evidence must be submitted within a
 * deadline (usually 7-10 days).
 *
 * Action:
 *   1. Set booking status to DISPUTED (new enum value)
 *   2. Set payment status to DISPUTED
 *   3. Invalidate all tickets for the booking (cannot check-in)
 *   4. Record audit trail with dispute details and evidence deadline
 *   5. Log critical alert for admin follow-up
 */
@Injectable()
export class DisputeCreatedHandler implements IWebhookEventHandler {
  private readonly logger = new Logger('Handler:DisputeCreated');
  readonly eventType = 'charge.dispute.created';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: PaymentAuditService,
  ) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const dispute = event.data.object as Stripe.Dispute;

    this.logger.error(
      `[CRITICAL] Chargeback opened: dispute=${dispute.id} | amount=${dispute.amount} | reason=${dispute.reason} | evidence_due_by=${(dispute as Stripe.Dispute & { evidence_due_by?: Date | null }).evidence_due_by?.toISOString() ?? 'N/A'}`,
    );

    try {
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
      const paymentIntentId =
        typeof dispute.payment_intent === 'string'
          ? dispute.payment_intent
          : dispute.payment_intent?.id;

      // Find the payment record linked to this dispute
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
        // Dispute for a charge we can't find — log for manual investigation
        return {
          success: true,
          skipped: true,
          message: `Dispute ${dispute.id}: no matching payment record (charge: ${chargeId})`,
        };
      }

      // Update payment and booking status
      await this.prisma.t_trx_payments.update({
        where: { id: payment.id },
        data: { status: 'DISPUTED' },
      });

      if (payment.booking) {
        await this.prisma.t_trx_bookings.update({
          where: { id: payment.booking.id },
          data: {
            status: 'DISPUTED',
            cancelled_reason: `Chargeback: ${dispute.reason} (dispute: ${dispute.id})`,
          },
        });

        // Invalidate tickets — disputed bookings cannot check in
        await this.prisma.t_trx_tickets.updateMany({
          where: { booking_id: payment.booking.id },
          data: { is_checked_in: false },
        });

        // Release seats so they can be resold while dispute is open
        await this.prisma.t_mtr_seats.updateMany({
          where: { booking_id: payment.booking.id },
          data: { status: 'AVAILABLE', booking_id: null },
        });
      }

      // Record audit trail
      await this.auditService.record(
        payment.booking?.user_id ?? 'system',
        'DISPUTE_CREATED',
        {
          dispute_id: dispute.id,
          payment_id: payment.id,
          booking_code: payment.booking?.booking_code,
          amount: dispute.amount,
          currency: dispute.currency,
          reason: dispute.reason,
          evidence_due_by: (dispute as Stripe.Dispute & { evidence_due_by?: Date | null }).evidence_due_by?.toISOString() ?? null,
          source: 'stripe_webhook',
        },
      );

      return {
        success: true,
        message: `Dispute ${dispute.id} opened — booking ${payment.booking?.booking_code ?? 'unknown'} set to DISPUTED, tickets invalidated`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error processing dispute.created for ${dispute.id}: ${msg}`,
      };
    }
  }
}
