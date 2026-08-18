import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { StripeService } from '../../../../common/stripe/stripe.service';
import { PaymentsService } from '../../payments.service';
import {
  IWebhookEventHandler,
  WebhookHandlerResult,
} from '../../interfaces/webhook-handler.interface';

/**
 * Handles `payment_intent.succeeded` — canonical confirmation fallback.
 *
 * `checkout.session.completed` remains the primary confirmation path; this
 * handler guarantees tickets are still issued if that session event is ever
 * missed. Both paths converge on the same idempotent
 * `processSuccessfulPayment` (atomic expiry-guarded update), so the second
 * event to arrive is always a no-op.
 */
@Injectable()
export class PaymentIntentSucceededHandler implements IWebhookEventHandler {
  private readonly logger = new Logger('Handler:PaymentIntentSucceeded');
  readonly eventType = 'payment_intent.succeeded';

  constructor(
    private readonly stripeService: StripeService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const intent = event.data.object as Stripe.PaymentIntent;

    try {
      // A PaymentIntent carries no client_reference_id — resolve the checkout
      // session it belongs to, which holds the booking reference.
      const sessions = await this.stripeService.listCheckoutSessions({
        payment_intent: intent.id,
        limit: 1,
      });
      const session = sessions.data[0];
      if (!session) {
        return {
          success: true,
          skipped: true,
          message: `No checkout session found for PI ${intent.id}`,
        };
      }

      if (session.payment_status !== 'paid') {
        return {
          success: true,
          skipped: true,
          message: `Session ${session.id} payment_status=${session.payment_status} — leaving to other handlers`,
        };
      }

      const outcome = await this.paymentsService.processSuccessfulPayment(session);
      if (outcome === 'skipped') {
        return {
          success: true,
          skipped: true,
          message: `PI ${intent.id}: booking already confirmed — redundant path`,
        };
      }
      return {
        success: true,
        message: `PI ${intent.id} confirmed booking via session ${session.id} (${outcome})`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error processing payment_intent.succeeded for ${intent.id}: ${msg}`,
      };
    }
  }
}
