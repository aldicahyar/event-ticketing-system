import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

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
   * Cron-like job to find all PENDING bookings that have passed their expiresAt,
   * cancel them, and release their seats back to AVAILABLE.
   */
  async expireOldBookings() {
    try {
      const expiredBookings = await this.prisma.booking.findMany({
        where: {
          status: 'PENDING',
          expiresAt: { lt: new Date() },
        },
        select: { id: true },
      });

      if (expiredBookings.length === 0) return;

      const bookingIds = expiredBookings.map((b) => b.id);
      this.logger.log(`Found ${bookingIds.length} expired bookings. Canceling...`);

      await this.prisma.$transaction(async (tx) => {
        // 1. Release seats
        await tx.seat.updateMany({
          where: { bookingId: { in: bookingIds } },
          data: { status: 'AVAILABLE', bookingId: null },
        });

        // 2. Mark bookings as EXPIRED
        await tx.booking.updateMany({
          where: { id: { in: bookingIds } },
          data: { status: 'EXPIRED' },
        });
      });

      this.logger.log(`Successfully expired ${bookingIds.length} bookings and released seats.`);
    } catch (error) {
      this.logger.error('Failed to expire old bookings', error);
    }
  }

  async checkout(userId: string, eventId: string, seatIds: string[]) {
    // 1. Verify Event
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { venue: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    if (!seatIds || seatIds.length === 0) {
      throw new BadRequestException('No seats selected');
    }

    // 2. Fetch all requested seats
    const seats = await this.prisma.seat.findMany({
      where: { id: { in: seatIds }, eventId },
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
      for (const seatId of seatIds) {
        const lockKey = `seat_lock:${seatId}`;
        // Set NX (Not Exists), EX 900 (Expires in 900s = 15m)
        const acquired = await redisClient.set(lockKey, userId, 'EX', 900, 'NX');
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
      const tierSettings = await this.prisma.ticketTierSetting.findMany({ where: { status: 'ACTIVE' } });
      const taxSetting = await this.prisma.taxSetting.findUnique({ where: { id: 'default' } });
      const taxPercent = taxSetting?.status === 'ACTIVE' ? taxSetting.ppnPercent : 0;

      let subtotal = 0;
      for (const seat of seats) {
        const tier = tierSettings.find((t) => t.id === seat.type);
        const multiplier = tier ? tier.multiplier : 1;
        const price = Number(event.basePrice) * multiplier;
        subtotal += price;
      }
      const tax = subtotal * (taxPercent / 100);
      const totalPrice = subtotal + tax;
      const bookingCode = `BOK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      // 5. Database Transaction to create Booking and update Seats
      const booking = await this.prisma.$transaction(async (tx) => {
        // Double check status inside transaction
        const currentSeats = await tx.seat.findMany({
          where: { id: { in: seatIds }, status: 'AVAILABLE' },
        });
        if (currentSeats.length !== seatIds.length) {
          throw new ConflictException('Seats were taken before transaction completed');
        }

        const b = await tx.booking.create({
          data: {
            userId,
            eventId,
            bookingCode,
            totalPrice,
            currency: event.currency,
            status: 'PENDING',
            expiresAt,
          },
        });

        await tx.seat.updateMany({
          where: { id: { in: seatIds } },
          data: { status: 'RESERVED', bookingId: b.id },
        });

        return b;
      });

      return {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        checkoutUrl: `https://mock.checkout.url/pay/${booking.id}`, // Placeholder
        expiresAt,
        message: 'Seats locked and booking created successfully',
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
  async findMyOrders(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
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
          select: { id: true, qrCode: true, isCheckedIn: true },
        },
      },
      orderBy: { bookedAt: 'desc' },
    });
  }

  /**
   * Get a single booking (order) owned by the user.
   * Throws NotFound if the booking does not exist or does not belong to the user.
   */
  async findMyOrderById(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, userId },
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
      throw new NotFoundException(`Order with ID ${bookingId} not found`);
    }

    return booking;
  }

  /**
   * Get all tickets (e-tickets) for a specific user.
   * Returns tickets associated with bookings owned by the user.
   * Only includes CONFIRMED bookings (i.e. valid tickets).
   */
  async findMyTickets(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        userId,
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
      orderBy: { event: { startDateTime: 'asc' } },
    });

    return bookings;
  }

  /**
   * Get aggregate order stats for the current user (for dashboard overview).
   */
  async getMyOrderStats(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId, status: 'CONFIRMED' },
      select: {
        totalPrice: true,
        _count: { select: { tickets: true } },
      },
    });

    const totalOrders = bookings.length;
    const totalTickets = bookings.reduce(
      (acc, b) => acc + (b._count?.tickets ?? 0),
      0,
    );
    const totalSpent = bookings.reduce(
      (acc, b) => acc + (b.totalPrice instanceof Prisma.Decimal ? Number(b.totalPrice) : Number(b.totalPrice ?? 0)),
      0,
    );

    return {
      totalOrders,
      totalTickets,
      totalSpent,
    };
  }
}
