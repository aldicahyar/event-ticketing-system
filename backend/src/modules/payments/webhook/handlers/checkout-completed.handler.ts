import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  IWebhookEventHandler,
  WebhookHandlerResult,
} from '../../interfaces/webhook-handler.interface';
import { PaymentsService } from '../../payments.service';

/**
 * Handles `checkout.session.completed` — the most critical webhook event.
 *
 * This is triggered when a customer successfully completes a Stripe Checkout
 * Session. The handler delegates to PaymentsService.processSuccessfulPayment,
 * which performs the atomic confirmation (race-condition guarded),
 * generates tickets, and sends the confirmation email.
 *
 * Idempotency: The underlying processSuccessfulPayment is already
 * idempotent — it checks booking.status === 'CONFIRMED' and skips.
 * Combined with the webhook event log deduplication, double-processing
 * is prevented at two levels.
 */
@Injectable()
export class CheckoutCompletedHandler implements IWebhookEventHandler {
  private readonly logger = new Logger('Handler:CheckoutCompleted');
  readonly eventType = 'checkout.session.completed';

  constructor(private readonly paymentsService: PaymentsService) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const outcome = await this.paymentsService.processSuccessfulPayment(session);

      if (outcome === 'skipped') {
        return {
          success: true,
          skipped: true,
          message: `Booking ${session.client_reference_id ?? 'unknown'} was already confirmed or skipped`,
        };
      }

      if (outcome === 'late') {
        return {
          success: true,
          message: `Late payment for session ${session.id} — auto-refunded`,
        };
      }

      return {
        success: true,
        message: `Booking confirmed for session ${session.id}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Failed to process checkout.session.completed: ${msg}`,
      };
    }
  }
}
