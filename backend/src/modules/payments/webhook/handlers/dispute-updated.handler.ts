import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { DisputesService } from '../../../disputes/disputes.service';
import {
  IWebhookEventHandler,
  WebhookHandlerResult,
} from '../../interfaces/webhook-handler.interface';

@Injectable()
export class DisputeUpdatedHandler implements IWebhookEventHandler {
  readonly eventType = 'charge.dispute.updated';

  constructor(private readonly disputesService: DisputesService) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const dispute = event.data.object as Stripe.Dispute;
    try {
      await this.disputesService.syncFromWebhook(dispute);
      return {
        success: true,
        message: `Dispute ${dispute.id} synced to ${dispute.status}`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      return {
        success: false,
        message: `Error processing dispute.updated for ${dispute.id}: ${message}`,
      };
    }
  }
}
