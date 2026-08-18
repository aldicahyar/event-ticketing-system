import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';

/**
 * Manages the webhook event log table for two purposes:
 *
 * 1. **Idempotency**: Before processing an event, check if its `stripe_event_id`
 *    already exists. If so, skip — Stripe sometimes retries webhook delivery.
 *
 * 2. **Audit trail**: Every received event is persisted with its status
 *    (RECEIVED → PROCESSED/FAILED/SKIPPED), payload, and any error message.
 *    This provides a complete record for debugging and compliance.
 *
 * All database errors are caught and logged — they must NOT prevent
 * the webhook processor from running. A failed audit insert is preferable
 * to a missed payment confirmation.
 */
@Injectable()
export class WebhookEventLogService {
  private readonly logger = new Logger('WebhookEventLog');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a Stripe event has already been processed.
   * Returns true if the event_id exists in the log with a terminal status.
   *
   * This is the idempotency guard — it prevents double-execution of
   * webhook events that Stripe redelivers due to timeout or network issues.
   */
  async isDuplicate(stripeEventId: string): Promise<boolean> {
    try {
      const existing = await this.prisma.t_trx_webhook_events.findUnique({
        where: { stripe_event_id: stripeEventId },
        select: { id: true, status: true },
      });

      if (!existing) return false;

      // If the event was already processed or skipped, it's a true duplicate.
      // If status is RECEIVED (crashed mid-processing), we allow reprocessing.
      return existing.status === 'PROCESSED' || existing.status === 'SKIPPED';
    } catch (err) {
      // If we can't check for duplicates, assume it's NOT a duplicate
      // to avoid missing critical events. Log the error for investigation.
      this.logger.error(
        `Failed to check duplicate for event ${stripeEventId}: ${this.getErrorMessage(err)}`,
      );
      return false;
    }
  }

  /**
   * Record a newly received webhook event.
   * Called before the handler runs — ensures we have a record even if
   * processing crashes.
   */
  async logReceived(stripeEventId: string, eventType: string, payload: unknown): Promise<void> {
    try {
      await this.prisma.t_trx_webhook_events.create({
        data: {
          stripe_event_id: stripeEventId,
          event_type: eventType,
          status: 'RECEIVED',
          payload: payload as object,
        },
      });
    } catch (err) {
      // Unique constraint violation means another worker already logged it
      // — that's fine for concurrent delivery. Other errors are logged but
      // don't block processing.
      this.logger.warn(
        `Could not log webhook event ${stripeEventId}: ${this.getErrorMessage(err)}`,
      );
    }
  }

  /**
   * Update an event's status to PROCESSED after successful handler execution.
   */
  async markProcessed(stripeEventId: string): Promise<void> {
    try {
      await this.prisma.t_trx_webhook_events.updateMany({
        where: { stripe_event_id: stripeEventId },
        data: {
          status: 'PROCESSED',
          processed_at: new Date(),
          error_message: null,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to mark event ${stripeEventId} as PROCESSED: ${this.getErrorMessage(err)}`,
      );
    }
  }

  /**
   * Update an event's status to FAILED after handler error.
   * The error message is stored for debugging.
   */
  async markFailed(stripeEventId: string, errorMessage: string): Promise<void> {
    try {
      await this.prisma.t_trx_webhook_events.updateMany({
        where: { stripe_event_id: stripeEventId },
        data: {
          status: 'FAILED',
          processed_at: new Date(),
          error_message: errorMessage,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to mark event ${stripeEventId} as FAILED: ${this.getErrorMessage(err)}`,
      );
    }
  }

  /**
   * Update an event's status to SKIPPED (e.g. irrelevant event type,
   * or event for a booking that no longer exists).
   */
  async markSkipped(stripeEventId: string, reason: string): Promise<void> {
    try {
      await this.prisma.t_trx_webhook_events.updateMany({
        where: { stripe_event_id: stripeEventId },
        data: {
          status: 'SKIPPED',
          processed_at: new Date(),
          error_message: reason,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to mark event ${stripeEventId} as SKIPPED: ${this.getErrorMessage(err)}`,
      );
    }
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }
}
