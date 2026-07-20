import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all bookings (orders) for a specific user.
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
