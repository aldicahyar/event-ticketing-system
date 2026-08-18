import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  IWebhookEventHandler,
  WebhookHandlerResult,
} from '../../interfaces/webhook-handler.interface';
import { PrismaService } from '../../../../common/database/prisma.service';
import { PaymentAuditService } from '../../audit/payment-audit.service';

/**
 * Records dispute fund movements for financial reconciliation (DB balance vs
 * Stripe Balance):
 *   - `charge.dispute.funds_withdrawn`  → Stripe holds the disputed amount
 *   - `charge.dispute.funds_reinstated` → amount returned after a won dispute
 *
 * Both only append to the audit trail; the dispute lifecycle itself is owned
 * by the dispute created/updated/closed handlers.
 *
 * ponytail: audit-only, no per-dispute timestamp column. Add
 * `funds_withdrawn_at`/`funds_reinstated_at` to `t_trx_disputes` when the admin
 * UI needs to display the exact settlement moment.
 */
abstract class DisputeFundsHandler implements IWebhookEventHandler {
  abstract readonly eventType: string;
  protected abstract readonly action: string;
  protected abstract readonly label: string;
  private readonly logger = new Logger('Handler:DisputeFunds');

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: PaymentAuditService,
  ) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const dispute = event.data.object as Stripe.Dispute;

    try {
      const record = await this.prisma.t_trx_disputes.findUnique({
        where: { stripe_dispute_id: dispute.id },
        select: {
          id: true,
          amount: true,
          currency: true,
          payment: {
            select: { booking: { select: { user_id: true, booking_code: true } } },
          },
        },
      });

      if (!record) {
        return {
          success: true,
          skipped: true,
          message: `Dispute ${dispute.id}: no matching dispute record`,
        };
      }

      const bookingCode = record.payment.booking.booking_code;
      await this.auditService.record(record.payment.booking.user_id, this.action, {
        dispute_id: record.id,
        stripe_dispute_id: dispute.id,
        amount: Number(record.amount),
        currency: record.currency,
        booking_code: bookingCode,
        source: 'stripe_webhook',
      });

      this.logger.log(`${this.label} recorded for dispute ${dispute.id} (booking ${bookingCode})`);
      return { success: true, message: `${this.label} for dispute ${dispute.id} recorded` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error processing ${this.eventType} for ${dispute.id}: ${msg}`,
      };
    }
  }
}

@Injectable()
export class DisputeFundsWithdrawnHandler extends DisputeFundsHandler {
  readonly eventType = 'charge.dispute.funds_withdrawn';
  protected readonly action = 'DISPUTE_FUNDS_WITHDRAWN';
  protected readonly label = 'Funds withdrawn';
}

@Injectable()
export class DisputeFundsReinstatedHandler extends DisputeFundsHandler {
  readonly eventType = 'charge.dispute.funds_reinstated';
  protected readonly action = 'DISPUTE_FUNDS_REINSTATED';
  protected readonly label = 'Funds reinstated';
}
