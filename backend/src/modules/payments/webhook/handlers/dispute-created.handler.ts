import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { DisputesService } from '../../../disputes/disputes.service';
import { PrismaService } from '../../../../common/database/prisma.service';
import {
  IWebhookEventHandler,
  WebhookHandlerResult,
} from '../../interfaces/webhook-handler.interface';

@Injectable()
export class DisputeCreatedHandler implements IWebhookEventHandler {
  readonly eventType = 'charge.dispute.created';

  constructor(
    private readonly prisma: PrismaService,
    private readonly disputesService: DisputesService,
  ) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const dispute = event.data.object as Stripe.Dispute;

    try {
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
      const paymentIntentId =
        typeof dispute.payment_intent === 'string'
          ? dispute.payment_intent
          : dispute.payment_intent?.id;
      const providerIds = [paymentIntentId, chargeId].filter((value): value is string =>
        Boolean(value),
      );
      if (providerIds.length === 0) {
        return {
          success: true,
          skipped: true,
          message: `Dispute ${dispute.id} has no payment identifiers`,
        };
      }

      const payment = await this.prisma.t_trx_payments.findFirst({
        where: {
          OR: providerIds.flatMap((providerId) => [
            { provider_tx_id: providerId },
            { provider_tx_id: { contains: providerId } },
          ]),
        },
        select: { id: true },
      });
      if (!payment) {
        return {
          success: true,
          skipped: true,
          message: `Dispute ${dispute.id}: no matching payment record`,
        };
      }

      const dueBy = dispute.evidence_details.due_by;
      await this.disputesService.opened({
        stripe_dispute_id: dispute.id,
        paymentId: payment.id,
        amount: dispute.amount / 100,
        currency: dispute.currency.toUpperCase(),
        reason: dispute.reason,
        dueBy: dueBy && dueBy > 0 ? new Date(dueBy * 1000) : null,
      });

      return { success: true, message: `Dispute ${dispute.id} opened` };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      return {
        success: false,
        message: `Error processing dispute.created for ${dispute.id}: ${message}`,
      };
    }
  }
}
