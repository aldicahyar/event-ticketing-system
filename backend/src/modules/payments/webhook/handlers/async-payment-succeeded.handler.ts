import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { IWebhookEventHandler, WebhookHandlerResult } from '../../interfaces/webhook-handler.interface';
import { PaymentsService } from '../../payments.service';

/**
 * Handles `checkout.session.async_payment_succeeded` — triggered when
 * an asynchronous payment method (SEPA Direct Debit, bank transfer,
 * OXXO, etc.) completes successfully after the checkout session.
 *
 * These methods don't complete instantly like cards. The checkout session
 * remains in "processing" until the payment settles. This handler confirms
 * the booking once the async payment succeeds.
 *
 * Action: Delegate to the same processSuccessfulPayment logic used by
 * the synchronous checkout.session.completed handler.
 */
@Injectable()
export class AsyncPaymentSucceededHandler implements IWebhookEventHandler {
  private readonly logger = new Logger('Handler:AsyncPaymentSucceeded');
  readonly eventType = 'checkout.session.async_payment_succeeded';

  constructor(private readonly paymentsService: PaymentsService) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const session = event.data.object as Stripe.Checkout.Session;

    this.logger.log(
      `Async payment succeeded: session=${session.id} | booking=${session.client_reference_id ?? 'N/A'}`,
    );

    try {
      const outcome = await this.paymentsService.processSuccessfulPayment(session);

      if (outcome === 'skipped') {
        return {
          success: true,
          skipped: true,
          message: `Async payment: booking ${session.client_reference_id ?? 'unknown'} already processed`,
        };
      }

      return {
        success: true,
        message: `Async payment confirmed for session ${session.id}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error processing async payment success for ${session.id}: ${msg}`,
      };
    }
  }
}
