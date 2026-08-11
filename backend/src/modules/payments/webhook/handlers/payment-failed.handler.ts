import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  IWebhookEventHandler,
  WebhookHandlerResult,
} from '../../interfaces/webhook-handler.interface';
import { PrismaService } from '../../../../common/database/prisma.service';

/**
 * Handles `payment_intent.payment_failed` — triggered when a payment
 * attempt fails (insufficient funds, declined card, etc.).
 *
 * Action: Update the payment record status to FAILED. If the payment
 * intent is associated with a booking, log the failure reason for
 * debugging and customer support.
 *
 * Note: This event may arrive BEFORE checkout.session.expired if the
 * payment fails during the checkout flow. We update only the payment
 * record — the booking status is managed by the session expiry flow.
 */
@Injectable()
export class PaymentFailedHandler implements IWebhookEventHandler {
  private readonly logger = new Logger('Handler:PaymentFailed');
  readonly eventType = 'payment_intent.payment_failed';

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    this.logger.warn(
      `Payment failed: pi=${paymentIntent.id} | amount=${paymentIntent.amount} | reason=${paymentIntent.last_payment_error?.message ?? 'unknown'}`,
    );

    // Try to find the payment record by provider_tx_id (session ID).
    // PaymentIntents are linked to sessions, so we search by the PI ID.
    try {
      const payment = await this.prisma.t_trx_payments.findFirst({
        where: {
          OR: [
            { provider_tx_id: paymentIntent.id },
            { provider_tx_id: { contains: paymentIntent.id } },
          ],
        },
      });

      if (payment) {
        await this.prisma.t_trx_payments.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
        return {
          success: true,
          message: `Payment ${payment.id} marked FAILED (PI: ${paymentIntent.id})`,
        };
      }

      // No payment record found — the failure happened before session completed,
      // so there's no payment record to update. This is normal.
      return {
        success: true,
        skipped: true,
        message: `No payment record for PI ${paymentIntent.id} — likely pre-checkout failure`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error updating payment status for PI ${paymentIntent.id}: ${msg}`,
      };
    }
  }
}
