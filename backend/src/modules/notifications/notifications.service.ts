import { Injectable, Logger } from '@nestjs/common';
import { IEmailTransport } from './interfaces/email-transport.interface';
import {
  PaymentSuccessEmailData,
  PaymentRefundedEmailData,
  BookingCancelledEmailData,
  RefundStatusEmailData,
  DisputeOpenedEmailData,
} from './interfaces/email-template.interface';
import { buildPaymentSuccessEmail } from './templates/payment-success.template';
import { buildPaymentRefundedEmail } from './templates/payment-refunded.template';
import { buildBookingCancelledEmail } from './templates/booking-cancelled.template';
import { buildRefundStatusEmail } from './templates/refund-status.template';
import { buildDisputeOpenedEmail } from './templates/dispute-opened.template';

/**
 * Central notification orchestration service.
 *
 * Responsibilities:
 *   - Accept high-level event data from payment/booking modules.
 *   - Delegate email rendering to the appropriate template builder.
 *   - Hand off to the injected transport for delivery.
 *   - Emit structured audit logs for every notification (success or failure).
 *
 * Design principles:
 *   - **Non-blocking**: Every method catches errors internally and logs them.
 *     A notification failure must never crash the payment flow.
 *   - **Single responsibility**: This service orchestrates only — it does
 *     not render templates or deliver emails directly.
 *   - **Audit-first**: Every send attempt is logged with enough detail for
 *     compliance and debugging.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly transport: IEmailTransport) {}

  /**
   * Send a payment-success confirmation email.
   * Called after `checkout.session.completed` confirms a booking.
   */
  async sendPaymentSuccess(to: string, data: PaymentSuccessEmailData): Promise<void> {
    const content = buildPaymentSuccessEmail(data);
    await this.deliver(to, content, 'PAYMENT_SUCCESS', data.bookingCode);
  }

  /**
   * Send a payment-refunded notification email.
   * Called when a late payment is automatically refunded.
   */
  async sendPaymentRefunded(to: string, data: PaymentRefundedEmailData): Promise<void> {
    const content = buildPaymentRefundedEmail(data);
    await this.deliver(to, content, 'PAYMENT_REFUNDED', data.bookingCode);
  }

  /**
   * Send a booking-cancelled notification email.
   * Called when a user or admin cancels a PENDING booking.
   */
  async sendBookingCancelled(to: string, data: BookingCancelledEmailData): Promise<void> {
    const content = buildBookingCancelledEmail(data);
    await this.deliver(to, content, 'BOOKING_CANCELLED', data.bookingCode);
  }

  async sendDisputeOpened(to: string, data: DisputeOpenedEmailData): Promise<void> {
    await this.deliver(to, buildDisputeOpenedEmail(data), 'DISPUTE_OPENED', data.bookingCode);
  }

  /** Send a refund request lifecycle notification (non-blocking by design). */
  async sendRefundStatus(to: string, data: RefundStatusEmailData): Promise<void> {
    const content = buildRefundStatusEmail(data);
    await this.deliver(to, content, 'REFUND_STATUS', data.bookingCode);
  }

  /**
   * Core delivery method — renders, sends, and logs the result.
   * Private so callers must use the typed public methods above.
   */
  private async deliver(
    to: string,
    content: { subject: string; html: string; text: string },
    eventType: string,
    bookingCode: string,
  ): Promise<void> {
    try {
      const result = await this.transport.send(to, content);

      if (result.success) {
        this.logger.log(
          `[NOTIFICATION] ${eventType} | to=${to} | booking=${bookingCode} | ` +
            `subject="${content.subject}" | transport=${result.transport} | ` +
            `messageId=${result.messageId ?? 'N/A'}`,
        );
      } else {
        this.logger.error(
          `[NOTIFICATION_FAILED] ${eventType} | to=${to} | booking=${bookingCode} | ` +
            `transport=${result.transport} | error=${result.error ?? 'unknown'}`,
        );
      }
    } catch (err: unknown) {
      // Catch-all safety net: even if the transport throws unexpectedly,
      // the payment flow must continue.
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[NOTIFICATION_ERROR] ${eventType} | to=${to} | booking=${bookingCode} | ` +
          `error=${errorMessage}`,
      );
    }
  }
}
