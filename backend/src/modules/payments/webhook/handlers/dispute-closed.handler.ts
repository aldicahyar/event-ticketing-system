import { Injectable } from '@nestjs/common';
import { DisputeStatus } from '@prisma/client';
import Stripe from 'stripe';
import { DisputesService } from '../../../disputes/disputes.service';
import {
  IWebhookEventHandler,
  WebhookHandlerResult,
} from '../../interfaces/webhook-handler.interface';

@Injectable()
export class DisputeClosedHandler implements IWebhookEventHandler {
  readonly eventType = 'charge.dispute.closed';

  constructor(private readonly disputesService: DisputesService) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const dispute = event.data.object as Stripe.Dispute;
    const outcome =
      dispute.status === 'won'
        ? DisputeStatus.WON
        : dispute.status === 'lost'
          ? DisputeStatus.LOST
          : null;
    if (!outcome) {
      return {
        success: true,
        skipped: true,
        message: `Dispute ${dispute.id} closed event has non-terminal status ${dispute.status}`,
      };
    }

    try {
      await this.disputesService.resolved(dispute.id, outcome);
      return {
        success: true,
        message: `Dispute ${dispute.id} finalized as ${outcome}`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      return {
        success: false,
        message: `Error processing dispute.closed for ${dispute.id}: ${message}`,
      };
    }
  }
}
