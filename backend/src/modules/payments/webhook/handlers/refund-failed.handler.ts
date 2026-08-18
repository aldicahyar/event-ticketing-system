import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import {
  IWebhookEventHandler,
  WebhookHandlerResult,
} from '../../interfaces/webhook-handler.interface';
import { RefundUpdatedHandler } from './refund-updated.handler';

/**
 * Handles `refund.failed` — a dedicated event Stripe emits when a refund
 * cannot be completed (e.g. closed bank account). The payload is a
 * `Stripe.Refund` identical to `refund.updated`, and RefundUpdatedHandler
 * already contains the idempotent failure branch (marks refund FAILED,
 * restores payment to COMPLETED, notifies the requester). We delegate to it
 * so the failure logic lives in exactly one place.
 */
@Injectable()
export class RefundFailedHandler implements IWebhookEventHandler {
  readonly eventType = 'refund.failed';

  constructor(private readonly refundUpdated: RefundUpdatedHandler) {}

  handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    return this.refundUpdated.handle(event);
  }
}
