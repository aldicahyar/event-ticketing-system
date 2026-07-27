import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import Stripe from 'stripe';

@Injectable()
export class BookingsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingsService.name);
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    // Run booking expiration check every 1 minute
    this.cleanupInterval = setInterval(() => this.expireOldBookings(), 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Cron-like job to find all PENDING bookings that have passed their expires_at,
   * cancel them, and release their seats back to AVAILABLE.
   */
  async expireOldBookings() {
    try {
      const expiredBookings = await this.prisma.t_trx_bookings.findMany({
        where: {
          status: 'PENDING',
          expires_at: { lt: new Date() },
        },
        select: { id: true },
      });

      if (expiredBookings.length === 0) return;

      const bookingIds = expiredBookings.map((b) => b.id);
      this.logger.log(`Found ${bookingIds.length} expired bookings. Canceling...`);

      await this.prisma.$transaction(async (tx) => {
        // 1. Release seats
        await tx.t_mtr_seats.updateMany({
          where: { booking_id: { in: bookingIds } },
          data: { status: 'AVAILABLE', booking_id: null },
        });

        // 2. Mark bookings as EXPIRED
        await tx.t_trx_bookings.updateMany({
          where: { id: { in: bookingIds } },
          data: { status: 'EXPIRED' },
        });
      });

      this.logger.log(`Successfully expired ${bookingIds.length} bookings and released seats.`);
    } catch (error) {
      this.logger.error('Failed to expire old bookings', error);
    }
  }

  async checkout(user_id: string, event_id: string, seatIds: string[], guestInfo?: { guest_name?: string, guest_email?: string, guest_phone?: string }) {
    // 1. Verify t_trx_events
    const event = await this.prisma.t_trx_events.findUnique({
      where: { id: event_id },
      include: { venue: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    if (!seatIds || seatIds.length === 0) {
      throw new BadRequestException('No seats selected');
    }

    // 2. Fetch all requested seats
    const seats = await this.prisma.t_mtr_seats.findMany({
      where: { id: { in: seatIds }, event_id },
    });
    if (seats.length !== seatIds.length) {
      throw new BadRequestException('Some seats do not exist or do not belong to this event');
    }

    const unavailableSeats = seats.filter((s) => s.status !== 'AVAILABLE');
    if (unavailableSeats.length > 0) {
      throw new ConflictException('Some selected seats are no longer available');
    }

    // 3. Acquire Distributed Locks for each seat using Redis
    const redisClient = this.redis.getClient();
    const lockedKeys: string[] = [];
    if (redisClient) {
      for (const seat_id of seatIds) {
        const lockKey = `seat_lock:${seat_id}`;
        // Set NX (Not Exists), EX 900 (Expires in 900s = 15m)
        const acquired = await redisClient.set(lockKey, user_id, 'EX', 900, 'NX');
        if (!acquired) {
          // If we fail to acquire a lock, rollback any locks we already got
          if (lockedKeys.length > 0) {
            await redisClient.del(...lockedKeys);
          }
          throw new ConflictException(`Seat is currently being booked by someone else. Please try again or select another seat.`);
        }
        lockedKeys.push(lockKey);
      }
    }

    try {
      // 4. Calculate Total Price
      const tierSettings = await this.prisma.t_mtr_ticket_tier_settings.findMany({ where: { status: 'ACTIVE' } });
      const taxSetting = await this.prisma.t_mtr_tax_settings.findUnique({ where: { id: 'default' } });
      const taxPercent = taxSetting?.status === 'ACTIVE' ? taxSetting.ppn_percent : 0;

      let subtotal = 0;
      for (const seat of seats) {
        const tier = tierSettings.find((t) => t.id === seat.type);
        const multiplier = tier ? tier.multiplier : 1;
        const price = Number(event.base_price) * multiplier;
        subtotal += price;
      }
      const tax = subtotal * (taxPercent / 100);
      const total_price = subtotal + tax;
      const booking_code = `BOK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      // 5. Database Transaction to create t_trx_bookings and update Seats
      const booking = await this.prisma.$transaction(async (tx) => {
        // Double check status inside transaction
        const currentSeats = await tx.t_mtr_seats.findMany({
          where: { id: { in: seatIds }, status: 'AVAILABLE' },
        });
        if (currentSeats.length !== seatIds.length) {
          throw new ConflictException('Seats were taken before transaction completed');
        }

        const b = await tx.t_trx_bookings.create({
          data: {
            user_id,
            event_id,
            booking_code,
            total_price,
            currency: event.currency,
            status: 'PENDING',
            expires_at,
            guest_name: guestInfo?.guest_name,
            guest_email: guestInfo?.guest_email,
            guest_phone: guestInfo?.guest_phone,
          },
        });

        await tx.t_mtr_seats.updateMany({
          where: { id: { in: seatIds } },
          data: { status: 'RESERVED', booking_id: b.id },
        });

        return b;
      });

      // 6. Create Stripe Checkout Session
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: '2023-10-16',
      });

      // Fetch user to get email for Stripe
      const customer = await this.prisma.t_mtr_users.findUnique({ where: { id: user_id } });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: customer?.email || undefined,
        line_items: [
          {
            price_data: {
              currency: event.currency.toLowerCase(),
              product_data: {
                name: `${event.title} - Ticketing`,
                description: `Booking Code: ${booking.booking_code}`,
              },
              unit_amount: Math.round(total_price * 100), // Stripe expects cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://localhost:3000/checkout/cancel`,
        client_reference_id: booking.id,
      });

      return {
        booking_id: booking.id,
        booking_code: booking.booking_code,
        checkoutUrl: session.url,
        expires_at,
        message: 'Seats locked and checkout session created successfully',
      };
    } catch (error) {
      // Rollback Redis locks if DB transaction fails
      if (redisClient && lockedKeys.length > 0) {
        await redisClient.del(...lockedKeys);
      }
    }
  }

  /**
   * Returns only bookings owned by the user, including event, venue, seats, and payment.
   */
  async findMyOrders(user_id: string) {
    return this.prisma.t_trx_bookings.findMany({
      where: { user_id },
      include: {
        event: {
          include: {
            venue: {
              select: {
                id: true,
                name: true,
                city: true,
                address: true,
              },
            },
          },
        },
        seats: {
          orderBy: [{ row: 'asc' }, { number: 'asc' }],
        },
        payment: true,
        tickets: {
          select: { id: true, qr_code: true, is_checked_in: true },
        },
      },
      orderBy: { booked_at: 'desc' },
    });
  }

  /**
   * Get a single booking (order) owned by the user.
   * Throws NotFound if the booking does not exist or does not belong to the user.
   */
  async findMyOrderById(user_id: string, booking_id: string) {
    const booking = await this.prisma.t_trx_bookings.findFirst({
      where: { id: booking_id, user_id },
      include: {
        event: {
          include: {
            venue: true,
          },
        },
        seats: {
          orderBy: [{ row: 'asc' }, { number: 'asc' }],
        },
        payment: true,
        tickets: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Order with ID ${booking_id} not found`);
    }

    return booking;
  }

  /**
   * Get all tickets (e-tickets) for a specific user.
   * Returns tickets associated with bookings owned by the user.
   * Only includes CONFIRMED bookings (i.e. valid tickets).
   */
  async findMyTickets(user_id: string) {
    const bookings = await this.prisma.t_trx_bookings.findMany({
      where: {
        user_id,
        status: 'CONFIRMED',
      },
      include: {
        event: {
          include: {
            venue: {
              select: {
                id: true,
                name: true,
                city: true,
                address: true,
              },
            },
          },
        },
        seats: {
          orderBy: [{ row: 'asc' }, { number: 'asc' }],
        },
        payment: true,
        tickets: true,
      },
      orderBy: { event: { start_date_time: 'asc' } },
    });

    return bookings;
  }

  /**
   * Get aggregate order stats for the current user (for dashboard overview).
   */
  async getMyOrderStats(user_id: string) {
    const bookings = await this.prisma.t_trx_bookings.findMany({
      where: { user_id, status: 'CONFIRMED' },
      select: {
        total_price: true,
        _count: { select: { tickets: true } },
      },
    });

    const totalOrders = bookings.length;
    const totalTickets = bookings.reduce(
      (acc, b) => acc + (b._count?.tickets ?? 0),
      0,
    );
    const totalSpent = bookings.reduce(
      (acc, b) => acc + (b.total_price instanceof Prisma.Decimal ? Number(b.total_price) : Number(b.total_price ?? 0)),
      0,
    );

    return {
      totalOrders,
      totalTickets,
      totalSpent,
    };
  }
}
