import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { IWebhookEventHandler, WebhookHandlerResult } from '../../interfaces/webhook-handler.interface';

/**
 * Handles `checkout.session.expired` — triggered when a customer
 * abandons checkout and the Stripe session expires.
 *
 * Action: Log the event. The booking remains PENDING and will be
 * cleaned up by the existing expireOldBookings cron job. No
 * immediate action is needed — this is informational only.
 */
@Injectable()
export class CheckoutExpiredHandler implements IWebhookEventHandler {
  private readonly logger = new Logger('Handler:CheckoutExpired');
  readonly eventType = 'checkout.session.expired';

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const session = event.data.object as Stripe.Checkout.Session;

    this.logger.log(
      `Checkout session expired: ${session.id} (booking: ${session.client_reference_id ?? 'N/A'})`,
    );

    return {
      success: true,
      message: `Session ${session.id} expired (booking: ${session.client_reference_id ?? 'N/A'})`,
    };
  }
}
