import Stripe from 'stripe';

/**
 * Result of processing a single webhook event.
 * Used by the processor to update the event log status.
 */
export interface WebhookHandlerResult {
  /** Whether the handler successfully processed the event. */
  success: boolean;
  /** Human-readable summary of what was done (for audit log). */
  message: string;
  /** Whether the event was deliberately skipped (e.g. duplicate, irrelevant). */
  skipped?: boolean;
}

/**
 * Contract for all webhook event handlers.
 *
 * Each handler is responsible for exactly ONE Stripe event type.
 * The handler must NOT throw — it must catch all errors internally
 * and return a WebhookHandlerResult with success=false on failure.
 * This ensures one failing handler never blocks other webhooks.
 *
 * Handlers are registered in the handler registry (handlers/index.ts)
 * and discovered by the WebhookProcessorService via dependency injection.
 */
export interface IWebhookEventHandler {
  /** The Stripe event type this handler processes (e.g. 'charge.refunded'). */
  readonly eventType: string;

  /**
   * Process the incoming Stripe event.
   * Must be idempotent — safe to call multiple times with the same event.
   */
  handle(event: Stripe.Event): Promise<WebhookHandlerResult>;
}
