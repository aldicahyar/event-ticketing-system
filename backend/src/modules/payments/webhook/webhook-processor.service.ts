import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { IWebhookEventHandler, WebhookHandlerResult } from '../interfaces/webhook-handler.interface';
import { WebhookEventLogService } from './webhook-event-log.service';
import { StripeService } from '../../../common/stripe/stripe.service';

/**
 * Central webhook processor that orchestrates the entire lifecycle
 * of an incoming Stripe webhook event:
 *
 *   1. **Verify** the Stripe signature (security: prevents spoofed webhooks)
 *   2. **Deduplicate** via event.id (idempotency: handles Stripe retries)
 *   3. **Log** the event to the audit trail
 *   4. **Route** to the registered handler for this event type
 *   5. **Update** the event log with the final status
 *
 * The processor is agnostic of business logic — it delegates all
 * domain operations to the registered IWebhookEventHandler instances.
 * Adding support for a new event type is as simple as creating a new
 * handler and registering it in the module.
 *
 * Error handling philosophy:
 *   - Signature verification failure → throw (Stripe will retry)
 *   - Duplicate event → skip silently (return success)
 *   - Handler failure → log + mark FAILED, return success (Stripe won't retry)
 *   - Unknown event type → log + mark SKIPPED, return success
 */
@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger('WebhookProcessor');
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly handlerMap: Map<string, IWebhookEventHandler>;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventLogService: WebhookEventLogService,
    private readonly stripeService: StripeService,
    handlers: IWebhookEventHandler[],
  ) {
    this.webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';

    // Reuse the single Stripe client owned by StripeService for signature
    // verification (no writes here, so no idempotency key needed).
    this.stripe = this.stripeService.client;

    // Build a lookup map from event type → handler for O(1) dispatch.
    // This is built once at construction, not per-request.
    this.handlerMap = new Map();
    for (const handler of handlers) {
      this.handlerMap.set(handler.eventType, handler);
    }

    this.logger.log(
      `Initialized with ${this.handlerMap.size} handlers: ${[...this.handlerMap.keys()].join(', ')}`,
    );
  }

  /**
   * Process a raw webhook request from Stripe.
   *
   * @param rawBody   The raw request body (Buffer) for signature verification
   * @param signature The Stripe-Signature header value
   * @returns Object indicating the event was received and processed
   * @throws Only on signature verification failure (triggers Stripe retry)
   */
  async process(
    rawBody: Buffer,
    signature: string,
  ): Promise<{ received: boolean }> {
    // ── Step 1: Verify Stripe signature ──────────────────────────
    // This is the security boundary — any failure here means the request
    // did not come from Stripe. We throw so Stripe retries with a valid
    // signature if it was a transient issue.
    let event: Stripe.Event;
    try {
      if (!this.webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      }
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook signature verification failed: ${msg}`);
      throw err;
    }

    this.logger.log(
      `Processing Stripe event: type=${event.type} | id=${event.id}`,
    );

    // ── Step 2: Idempotency check ────────────────────────────────
    // Stripe may redeliver events. We skip if already processed.
    if (await this.eventLogService.isDuplicate(event.id)) {
      this.logger.warn(
        `Skipping duplicate event: type=${event.type} | id=${event.id}`,
      );
      return { received: true };
    }

    // ── Step 3: Log the event (audit trail) ──────────────────────
    await this.eventLogService.logReceived(event.id, event.type, {
      type: event.type,
      id: event.id,
      created: event.created,
      // Store a redacted version of the data object — no full card data.
      // Stripe webhook payloads don't contain PAN/CVV, but we minimize anyway.
      data_object_id: (event.data.object as { id?: string })?.id,
    });

    // ── Step 4: Route to handler ─────────────────────────────────
    const handler = this.handlerMap.get(event.type);

    if (!handler) {
      // Unknown event type — log and skip gracefully.
      this.logger.warn(`No handler registered for event type: ${event.type}`);
      await this.eventLogService.markSkipped(
        event.id,
        `No handler for event type ${event.type}`,
      );
      return { received: true };
    }

    // ── Step 5: Execute handler + update log ─────────────────────
    try {
      const result: WebhookHandlerResult = await handler.handle(event);

      if (result.skipped) {
        await this.eventLogService.markSkipped(event.id, result.message);
        this.logger.log(
          `Event skipped: type=${event.type} | id=${event.id} | reason=${result.message}`,
        );
      } else {
        await this.eventLogService.markProcessed(event.id, result.message);
        this.logger.log(
          `Event processed: type=${event.type} | id=${event.id} | ${result.message}`,
        );
      }
    } catch (err) {
      // Handler threw unexpectedly — record the error and continue.
      // We do NOT rethrow because Stripe would retry endlessly, and the
      // handler is supposed to catch its own errors. This is a safety net.
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Handler threw for event ${event.type} (${event.id}): ${errorMsg}`,
      );
      await this.eventLogService.markFailed(event.id, errorMsg);
    }

    return { received: true };
  }
}
