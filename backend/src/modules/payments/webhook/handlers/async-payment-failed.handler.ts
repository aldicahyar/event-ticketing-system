import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { IWebhookEventHandler, WebhookHandlerResult } from '../../interfaces/webhook-handler.interface';
import { PrismaService } from '../../../../common/database/prisma.service';

/**
 * Handles `checkout.session.async_payment_failed` — triggered when
 * an asynchronous payment method (SEPA, bank transfer, OXXO) fails
 * after the checkout session was created.
 *
 * Action:
 *   1. Mark the booking as EXPIRED (payment failed → seats released)
 *   2. If a payment record exists, mark it FAILED
 *   3. Release the held seats back to the pool
 *   4. Log the failure for customer support
 */
@Injectable()
export class AsyncPaymentFailedHandler implements IWebhookEventHandler {
  private readonly logger = new Logger('Handler:AsyncPaymentFailed');
  readonly eventType = 'checkout.session.async_payment_failed';

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const session = event.data.object as Stripe.Checkout.Session;

    this.logger.warn(
      `Async payment failed: session=${session.id} | booking=${session.client_reference_id ?? 'N/A'}`,
    );

    try {
      const bookingId = session.client_reference_id;
      if (!bookingId) {
        return {
          success: true,
          skipped: true,
          message: `Async payment failed for session ${session.id} — no booking reference`,
        };
      }

      // Update booking status to EXPIRED
      await this.prisma.t_trx_bookings.updateMany({
        where: { id: bookingId, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });

      // Release seats
      await this.prisma.t_mtr_seats.updateMany({
        where: { booking_id: bookingId },
        data: { booking_id: null, status: 'AVAILABLE' },
      });

      // Mark payment record as FAILED if it exists
      await this.prisma.t_trx_payments.updateMany({
        where: { booking_id: bookingId },
        data: { status: 'FAILED' },
      });

      return {
        success: true,
        message: `Async payment failed — booking ${bookingId} expired, seats released`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error processing async payment failure for ${session.id}: ${msg}`,
      };
    }
  }
}
