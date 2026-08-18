import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../../../common/database/prisma.service';
import { PaymentAuditService } from '../../audit/payment-audit.service';
import {
  IWebhookEventHandler,
  WebhookHandlerResult,
} from '../../interfaces/webhook-handler.interface';

/**
 * Resolves the local payment (and its owner) from a Stripe object that carries
 * `charge` / `payment_intent` references, mirroring DisputeCreatedHandler.
 * Shared by the Radar fraud/review handlers below.
 */
async function resolvePaymentUser(
  prisma: PrismaService,
  charge: string | Stripe.Charge | null | undefined,
  paymentIntent: string | Stripe.PaymentIntent | null | undefined,
): Promise<{ paymentId: string; userId: string; bookingCode: string } | null> {
  const chargeId = typeof charge === 'string' ? charge : charge?.id;
  const intentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id;
  const providerIds = [intentId, chargeId].filter((v): v is string => Boolean(v));
  if (providerIds.length === 0) return null;

  const payment = await prisma.t_trx_payments.findFirst({
    where: {
      OR: providerIds.flatMap((id) => [
        { provider_tx_id: id },
        { provider_tx_id: { contains: id } },
      ]),
    },
    select: { id: true, booking: { select: { user_id: true, booking_code: true } } },
  });
  if (!payment) return null;
  return {
    paymentId: payment.id,
    userId: payment.booking.user_id,
    bookingCode: payment.booking.booking_code,
  };
}

/**
 * Handles `radar.early_fraud_warning.created`.
 *
 * Stripe Radar flags a charge that its issuer reported as fraudulent — an early
 * signal that a chargeback is likely. Acting now (proactive refund) avoids the
 * dispute fee and keeps the dispute ratio down. We persist the warning to the
 * audit trail so finance/admins can act; the actual refund stays a human
 * decision via the existing refund flow.
 *
 * ponytail: audit + log only, no dedicated admin email. Add a
 * `NotificationsService.sendFraudWarning` template when admins need push alerts
 * rather than polling the security-log/dashboard.
 */
@Injectable()
export class EarlyFraudWarningHandler implements IWebhookEventHandler {
  private readonly logger = new Logger('Handler:EarlyFraudWarning');
  readonly eventType = 'radar.early_fraud_warning.created';

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PaymentAuditService,
  ) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const warning = event.data.object as Stripe.Radar.EarlyFraudWarning;

    try {
      const resolved = await resolvePaymentUser(
        this.prisma,
        warning.charge,
        warning.payment_intent,
      );
      if (!resolved) {
        return {
          success: true,
          skipped: true,
          message: `EFW ${warning.id}: no matching payment record`,
        };
      }

      await this.audit.record(resolved.userId, 'FRAUD_EARLY_WARNING', {
        early_fraud_warning_id: warning.id,
        payment_id: resolved.paymentId,
        booking_code: resolved.bookingCode,
        fraud_type: warning.fraud_type,
        actionable: warning.actionable,
        source: 'stripe_webhook',
      });

      this.logger.warn(
        `Early fraud warning ${warning.id} for booking ${resolved.bookingCode} ` +
          `(type=${warning.fraud_type}, actionable=${warning.actionable})`,
      );
      return {
        success: true,
        message: `Early fraud warning ${warning.id} recorded for booking ${resolved.bookingCode}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error processing radar.early_fraud_warning.created for ${warning.id}: ${msg}`,
      };
    }
  }
}

/**
 * Handles `review.opened` / `review.closed`.
 *
 * A Radar review means a payment is held for manual inspection. Recording open
 * gives admins visibility that fulfillment should wait; recording close (with
 * Stripe's reason) tells them the hold is resolved. Ticket issuance itself is
 * still governed by `payment_intent`/`checkout.session` events — this handler
 * only annotates the audit trail.
 */
abstract class ReviewHandler implements IWebhookEventHandler {
  abstract readonly eventType: string;
  protected abstract readonly action: string;
  private readonly logger = new Logger('Handler:Review');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PaymentAuditService,
  ) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const review = event.data.object as Stripe.Review;

    try {
      const resolved = await resolvePaymentUser(this.prisma, review.charge, review.payment_intent);
      if (!resolved) {
        return {
          success: true,
          skipped: true,
          message: `Review ${review.id}: no matching payment record`,
        };
      }

      await this.audit.record(resolved.userId, this.action, {
        review_id: review.id,
        payment_id: resolved.paymentId,
        booking_code: resolved.bookingCode,
        reason: review.reason,
        closed_reason: review.closed_reason ?? null,
        source: 'stripe_webhook',
      });

      this.logger.warn(
        `${this.eventType} ${review.id} for booking ${resolved.bookingCode} (reason=${review.reason})`,
      );
      return {
        success: true,
        message: `${this.eventType} ${review.id} recorded for booking ${resolved.bookingCode}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error processing ${this.eventType} for ${review.id}: ${msg}`,
      };
    }
  }
}

@Injectable()
export class ReviewOpenedHandler extends ReviewHandler {
  readonly eventType = 'review.opened';
  protected readonly action = 'PAYMENT_REVIEW_OPENED';
}

@Injectable()
export class ReviewClosedHandler extends ReviewHandler {
  readonly eventType = 'review.closed';
  protected readonly action = 'PAYMENT_REVIEW_CLOSED';
}
