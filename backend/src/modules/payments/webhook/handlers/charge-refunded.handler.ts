import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { IWebhookEventHandler, WebhookHandlerResult } from '../../interfaces/webhook-handler.interface';
import { PrismaService } from '../../../../common/database/prisma.service';
import { PaymentAuditService } from '../../audit/payment-audit.service';

/**
 * Handles `charge.refunded` — triggered when a refund is issued,
 * whether automatically (late payment) or manually (via Stripe Dashboard
 * or the future admin refund API).
 *
 * This handler ensures that ALL refunds — regardless of origin — are
 * synced to the database. Without it, refunds issued via the Stripe
 * Dashboard would leave the DB in an inconsistent state.
 *
 * Action:
 *   1. Find the payment record by the charge's payment intent
 *   2. Update payment status to REFUNDED
 *   3. If the booking is CONFIRMED, mark it CANCELLED (seats released)
 *   4. Record audit trail
 */
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
      // The charge object contains refund details
      const refundAmount = charge.amount_refunded;
      const isFullRefund = refundAmount >= charge.amount;
      const paymentIntentId = typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : null;

      if (!paymentIntentId) {
        return {
          success: true,
          skipped: true,
          message: `Charge ${charge.id} has no payment_intent — cannot link to booking`,
        };
      }

      // Find the payment record — try matching by session ID or PI ID
      const payment = await this.prisma.t_trx_payments.findFirst({
        where: {
          OR: [
            { provider_tx_id: paymentIntentId },
            { provider_tx_id: { contains: paymentIntentId } },
          ],
        },
        include: { booking: { select: { id: true, user_id: true, booking_code: true, status: true } } },
      });

      if (!payment) {
        return {
          success: true,
          skipped: true,
          message: `No payment record found for PI ${paymentIntentId}`,
        };
      }

      // Update payment status
      await this.prisma.t_trx_payments.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      });

      // If booking is still CONFIRMED, mark it REFUNDED and release seats
      if (payment.booking && payment.booking.status === 'CONFIRMED') {
        await this.prisma.t_trx_bookings.update({
          where: { id: payment.booking.id },
          data: {
            status: 'REFUNDED',
            cancelled_at: new Date(),
            cancelled_reason: `Refunded via Stripe (${isFullRefund ? 'full' : 'partial'})`,
          },
        });

        // Release the seats back to the pool
        await this.prisma.t_mtr_seats.updateMany({
          where: { booking_id: payment.booking.id },
          data: { booking_id: null, status: 'AVAILABLE' },
        });

        // Invalidate tickets
        await this.prisma.t_trx_tickets.deleteMany({
          where: { booking_id: payment.booking.id },
        });

        this.logger.log(
          `Booking ${payment.booking.booking_code} cancelled due to external refund`,
        );
      }

      // Record audit trail
      await this.auditService.record(
        payment.booking?.user_id ?? 'system',
        'EXTERNAL_REFUND_SYNCED',
        {
          payment_id: payment.id,
          booking_code: payment.booking?.booking_code,
          charge_id: charge.id,
          refund_amount: refundAmount,
          is_full_refund: isFullRefund,
          source: 'stripe_webhook',
        },
      );

      return {
        success: true,
        message: `Refund synced: ${isFullRefund ? 'full' : 'partial'} refund of ${refundAmount} for charge ${charge.id}`,
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
