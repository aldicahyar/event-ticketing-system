import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { StripeService } from '../../common/stripe/stripe.service';
import { BookingsService } from './bookings.service';

function createPrismaMock() {
  const tx = {
    t_mtr_seats: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    t_trx_bookings: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn(),
    },
  };
  return {
    t_trx_bookings: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    t_trx_events: { findUnique: jest.fn() },
    t_trx_tickets: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    t_mtr_seats: { findMany: jest.fn() },
    t_mtr_users: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    __tx: tx,
  };
}

function createRedisMock() {
  return {
    getClient: jest.fn().mockReturnValue({ del: jest.fn().mockResolvedValue(1) }),
  };
}

function createPaymentsMock() {
  return {
    isBookingActuallyPaid: jest.fn().mockResolvedValue(false),
    expireStripeSession: jest.fn().mockResolvedValue(undefined),
  };
}

async function createService(prisma = createPrismaMock()) {
  const payments = createPaymentsMock();
  const module = await Test.createTestingModule({
    providers: [
      BookingsService,
      { provide: PrismaService, useValue: prisma },
      { provide: RedisService, useValue: createRedisMock() },
      { provide: PaymentsService, useValue: payments },
      { provide: ConfigService, useValue: { get: jest.fn() } },
      {
        provide: StripeService,
        useValue: { createCheckoutSession: jest.fn(), client: {} },
      },
      {
        provide: NotificationsService,
        useValue: {
          sendPaymentSuccess: jest.fn(),
          sendPaymentRefunded: jest.fn(),
          sendBookingCancelled: jest.fn(),
        },
      },
    ],
  }).compile();
  return { service: module.get(BookingsService), prisma, payments };
}

const pendingBooking = {
  id: 'booking-1',
  user_id: 'user-1',
  event_id: 'event-1',
  booking_code: 'BOK-123',
  status: 'PENDING',
  total_price: 100,
  currency: 'USD',
  expires_at: new Date(Date.now() + 600_000),
  booked_at: new Date(),
  confirmed_at: null,
  cancelled_at: null,
  cancelled_reason: null,
  seat_ids: ['seat-a', 'seat-b'],
  stripe_session_id: 'cs_test_123',
  event: { title: 'Concert', start_date_time: new Date() },
  seats: [{ id: 'seat-a' }, { id: 'seat-b' }],
};

const cancelledResult = {
  ...pendingBooking,
  status: 'CANCELLED',
  cancelled_at: new Date(),
};

const owner = { id: 'user-1', role: 'ATTENDEE', email: 'owner@test.com' };
const other = { id: 'user-2', role: 'ATTENDEE', email: 'other@test.com' };
const admin = { id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' };

describe('BookingsService - cancelBooking', () => {
  it('cancels an owned pending booking and releases seats', async () => {
    const { service, prisma } = await createService();
    prisma.t_trx_bookings.findUnique.mockResolvedValue(pendingBooking);
    prisma.__tx.t_trx_bookings.findUnique.mockResolvedValue(cancelledResult);

    const result = await service.cancelBooking(
      'booking-1',
      owner,
      'CHANGE_OF_PLANS',
      'Schedule conflict',
    );

    expect(result.status).toBe('CANCELLED');
    expect(prisma.__tx.t_mtr_seats.updateMany).toHaveBeenCalledWith({
      where: { booking_id: 'booking-1' },
      data: { status: 'AVAILABLE', booking_id: null },
    });
  });

  it('allows an admin and expires the Stripe session', async () => {
    const { service, prisma, payments } = await createService();
    prisma.t_trx_bookings.findUnique.mockResolvedValue(pendingBooking);
    prisma.__tx.t_trx_bookings.findUnique.mockResolvedValue(cancelledResult);

    await service.cancelBooking('booking-1', admin, 'OTHER', 'Compliance');

    expect(payments.expireStripeSession).toHaveBeenCalledWith('cs_test_123', 'BOK-123');
  });

  it('does not expire Stripe when the session is absent', async () => {
    const { service, prisma, payments } = await createService();
    prisma.t_trx_bookings.findUnique.mockResolvedValue({
      ...pendingBooking,
      stripe_session_id: null,
    });
    prisma.__tx.t_trx_bookings.findUnique.mockResolvedValue(cancelledResult);

    await service.cancelBooking('booking-1', owner, 'OTHER', 'Reason');
    expect(payments.expireStripeSession).not.toHaveBeenCalled();
  });

  it('rejects a missing booking', async () => {
    const { service, prisma } = await createService();
    prisma.t_trx_bookings.findUnique.mockResolvedValue(null);
    await expect(service.cancelBooking('missing', owner, 'OTHER', 'Reason')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects a non-owner attendee', async () => {
    const { service, prisma } = await createService();
    prisma.t_trx_bookings.findUnique.mockResolvedValue(pendingBooking);
    await expect(service.cancelBooking('booking-1', other, 'OTHER', 'Reason')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it.each(['CONFIRMED', 'EXPIRED', 'CANCELLED'])('rejects status %s', async (status) => {
    const { service, prisma } = await createService();
    prisma.t_trx_bookings.findUnique.mockResolvedValue({
      ...pendingBooking,
      status,
    });
    await expect(service.cancelBooking('booking-1', owner, 'OTHER', 'Reason')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a concurrent status change', async () => {
    const { service, prisma } = await createService();
    prisma.t_trx_bookings.findUnique.mockResolvedValue(pendingBooking);
    prisma.__tx.t_trx_bookings.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.cancelBooking('booking-1', owner, 'OTHER', 'Reason')).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('BookingsService - duplicate checkout guard', () => {
  const event = {
    id: 'event-1',
    title: 'Concert',
    currency: 'USD',
    base_price: 50,
    venue: { id: 'venue-1' },
  };
  const seats = [
    { id: 'seat-a', event_id: 'event-1', status: 'AVAILABLE', type: 'REGULAR' },
    { id: 'seat-b', event_id: 'event-1', status: 'AVAILABLE', type: 'REGULAR' },
  ];

  it('rejects an identical pending seat selection', async () => {
    const { service, prisma } = await createService();
    prisma.t_trx_events.findUnique.mockResolvedValue(event);
    prisma.t_mtr_seats.findMany.mockResolvedValue(seats);
    prisma.t_trx_bookings.findFirst.mockResolvedValue({
      id: 'booking-1',
      booking_code: 'BOK-123',
      seat_ids: ['seat-a', 'seat-b'],
    });
    await expect(service.checkout('user-1', 'event-1', ['seat-a', 'seat-b'])).rejects.toThrow(
      /already in progress/,
    );
  });

  it('does not mistake a larger selection for an exact duplicate', async () => {
    const { service, prisma } = await createService();
    prisma.t_trx_events.findUnique.mockResolvedValue(event);
    prisma.t_mtr_seats.findMany.mockResolvedValue([{ ...seats[0], status: 'RESERVED' }, seats[1]]);
    prisma.t_trx_bookings.findFirst.mockResolvedValue({
      id: 'booking-1',
      booking_code: 'BOK-123',
      seat_ids: ['seat-a', 'seat-b', 'seat-c'],
    });
    await expect(service.checkout('user-1', 'event-1', ['seat-a', 'seat-b'])).rejects.toThrow(
      /no longer available/,
    );
  });
});

describe('BookingsService - checkInTicket', () => {
  const validTicket = {
    id: 'ticket-1',
    is_checked_in: false,
    revoked_at: null,
    booking: {
      status: 'CONFIRMED',
      event: { organizer_id: 'organizer-1' },
    },
  };

  it('uses a race-safe conditional update', async () => {
    const { service, prisma } = await createService();
    prisma.t_trx_tickets.findUnique
      .mockResolvedValueOnce(validTicket)
      .mockResolvedValueOnce({ ...validTicket, is_checked_in: true });

    await service.checkInTicket('qr-1', {
      id: 'organizer-1',
      role: 'ORGANIZER',
    });

    expect(prisma.t_trx_tickets.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'ticket-1',
        is_checked_in: false,
        revoked_at: null,
        booking: { status: 'CONFIRMED' },
      },
      data: { is_checked_in: true, checked_in_at: expect.any(Date) },
    });
  });

  it('rejects attendees before reading ticket data', async () => {
    const { service, prisma } = await createService();
    await expect(service.checkInTicket('qr-1', { id: 'user-1', role: 'ATTENDEE' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.t_trx_tickets.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a different organizer', async () => {
    const { service, prisma } = await createService();
    prisma.t_trx_tickets.findUnique.mockResolvedValue(validTicket);
    await expect(
      service.checkInTicket('qr-1', {
        id: 'organizer-2',
        role: 'ORGANIZER',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it.each([
    { revoked_at: new Date() },
    { booking: { status: 'DISPUTED', event: { organizer_id: 'organizer-1' } } },
  ])('rejects revoked or disputed tickets', async (override) => {
    const { service, prisma } = await createService();
    prisma.t_trx_tickets.findUnique.mockResolvedValue({
      ...validTicket,
      ...override,
    });
    await expect(
      service.checkInTicket('qr-1', {
        id: 'organizer-1',
        role: 'ORGANIZER',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects a lost conditional-update race', async () => {
    const { service, prisma } = await createService();
    prisma.t_trx_tickets.findUnique.mockResolvedValue(validTicket);
    prisma.t_trx_tickets.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.checkInTicket('qr-1', admin)).rejects.toThrow(ConflictException);
  });
});
