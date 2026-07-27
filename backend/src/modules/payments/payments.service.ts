import { Injectable, Logger, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';
import { PrismaService } from '../../common/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2023-10-16',
    });
  }

  async handleWebhook(req: RawBodyRequest<Request>, signature: string) {
    let event: Stripe.Event;

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      }
      
      // We must use req.rawBody to verify the signature properly
      if (!req.rawBody) {
        throw new Error('Missing raw body for Stripe signature validation');
      }

      event = this.stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed. ${err.message}`);
      throw err;
    }

    this.logger.log(`Received Stripe Webhook Event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.processSuccessfulPayment(session);
    }

    return { received: true };
  }

  private async processSuccessfulPayment(session: Stripe.Checkout.Session) {
    const bookingId = session.client_reference_id;
    if (!bookingId) {
      this.logger.error('No client_reference_id found in checkout session');
      return;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { seats: true },
    });

    if (!booking) {
      this.logger.error(`Booking ${bookingId} not found for completed session`);
      return;
    }

    if (booking.status === 'CONFIRMED') {
      this.logger.warn(`Booking ${bookingId} is already CONFIRMED`);
      return;
    }

    const amountPaid = session.amount_total ? session.amount_total / 100 : 0;

    await this.prisma.$transaction(async (tx) => {
      // 1. Create Payment Record
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: amountPaid,
          currency: (session.currency || 'usd').toUpperCase(),
          provider: 'STRIPE',
          providerTxId: session.id,
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      });

      // 2. Update Booking Status
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });

      // 3. Update Seat Statuses
      const seatIds = booking.seats.map(s => s.id);
      await tx.seat.updateMany({
        where: { id: { in: seatIds } },
        data: { status: 'SOLD' },
      });

      // 4. Generate E-Tickets for each seat
      for (const seat of booking.seats) {
        await tx.ticket.create({
          data: {
            bookingId: booking.id,
            seatId: seat.id,
            qrCode: uuidv4(), // Unique QR code for scanner
          },
        });
      }
    });

    this.logger.log(`Successfully processed payment and issued tickets for Booking ${booking.bookingCode}`);
  }
}
