import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StripeService } from '../../common/stripe/stripe.service';

// ── Mock factories ────────────────────────────────────────────────

function createPrismaMock() {
  const txMocks = {
    t_mtr_seats: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    t_trx_bookings: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue(null), // overridden per-test
    },
  };

  return {
    t_trx_bookings: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    t_trx_events: { findUnique: jest.fn() },
    t_mtr_seats: { findMany: jest.fn() },
    t_mtr_users: { findUnique: jest.fn().mockResolvedValue(null) },
    // $transaction executes the callback with `txMocks` as the tx client
    $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) =>
      cb(txMocks),
    ),
    // Exposed so individual tests can override tx behaviour
    __tx: txMocks,
  };
}

function createRedisMock() {
  return {
    getClient: jest.fn().mockReturnValue({
      del: jest.fn().mockResolvedValue(1),
    }),
  };
}

function createPaymentsMock() {
  return {
    isBookingActuallyPaid: jest.fn().mockResolvedValue(false),
    expireStripeSession: jest.fn().mockResolvedValue(undefined),
  };
}

// ── Test fixture ──────────────────────────────────────────────────

const PENDING_BOOKING = {
  id: 'booking-1',
  user_id: 'user-1',
  event_id: 'event-1',
  booking_code: 'BOK-123',
  status: 'PENDING',
  total_price: 100,
  currency: 'USD',
  expires_at: new Date(Date.now() + 10 * 60 * 1000),
  booked_at: new Date(),
  confirmed_at: null,
  cancelled_at: null,
  cancelled_reason: null,
  seat_ids: ['seat-a', 'seat-b'],
  stripe_session_id: 'cs_test_123',
  event: { title: 'Concert', start_date_time: new Date() },
  seats: [{ id: 'seat-a' }, { id: 'seat-b' }],
};

const CANCELLED_RESULT = {
  ...PENDING_BOOKING,
  status: 'CANCELLED',
  cancelled_at: new Date(),
  cancelled_reason: 'USER_CANCELLED | reason=CHANGE_OF_PLANS | desc="test" | by=user:owner@test.com',
};

// ── Tests ─────────────────────────────────────────────────────────

describe('BookingsService — cancelBooking', () => {
  let service: BookingsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let paymentsMock: ReturnType<typeof createPaymentsMock>;

  const ownerUser = { id: 'user-1', role: 'ATTENDEE', email: 'owner@test.com' };
  const otherUser = { id: 'user-2', role: 'ATTENDEE', email: 'other@test.com' };
  const adminUser = { id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' };

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    const redisMock = createRedisMock();
    paymentsMock = createPaymentsMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: redisMock },
        { provide: PaymentsService, useValue: paymentsMock },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: StripeService,
          useValue: {
            createCheckoutSession: jest.fn(),
            expireCheckoutSession: jest.fn(),
            client: {},
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendPaymentSuccess: jest.fn().mockResolvedValue(undefined),
            sendPaymentRefunded: jest.fn().mockResolvedValue(undefined),
            sendBookingCancelled: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  // ── Success scenarios ───────────────────────────────────────────

  it('should cancel a PENDING booking owned by the user', async () => {
    prismaMock.t_trx_bookings.findUnique.mockResolvedValue(PENDING_BOOKING);
    prismaMock.__tx.t_trx_bookings.findUnique.mockResolvedValue(CANCELLED_RESULT);
    prismaMock.t_mtr_users.findUnique.mockResolvedValue({
      email: 'owner@test.com',
      name: 'Owner',
    });

    const result = await service.cancelBooking(
      'booking-1',
      ownerUser,
      'CHANGE_OF_PLANS',
      'I have a schedule conflict',
    );

    expect(result.status).toBe('CANCELLED');
    expect(prismaMock.__tx.t_mtr_seats.updateMany).toHaveBeenCalledWith({
      where: { booking_id: 'booking-1' },
      data: { status: 'AVAILABLE', booking_id: null },
    });
    expect(prismaMock.__tx.t_trx_bookings.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'CANCELLED' }),
      }),
    );
  });

  it('should allow an admin to cancel a booking they do not own', async () => {
    prismaMock.t_trx_bookings.findUnique.mockResolvedValue(PENDING_BOOKING);
    prismaMock.__tx.t_trx_bookings.findUnique.mockResolvedValue(CANCELLED_RESULT);
    prismaMock.t_mtr_users.findUnique.mockResolvedValue({
      email: 'owner@test.com',
      name: 'Owner',
    });

    const result = await service.cancelBooking(
      'booking-1',
      adminUser,
      'OTHER',
      'Admin cancellation for compliance',
    );

    expect(result.status).toBe('CANCELLED');
    expect(paymentsMock.expireStripeSession).toHaveBeenCalledWith(
      'cs_test_123',
      'BOK-123',
    );
  });

  it('should expire the Stripe session when stripe_session_id exists', async () => {
    prismaMock.t_trx_bookings.findUnique.mockResolvedValue(PENDING_BOOKING);
    prismaMock.__tx.t_trx_bookings.findUnique.mockResolvedValue(CANCELLED_RESULT);
    prismaMock.t_mtr_users.findUnique.mockResolvedValue({
      email: 'owner@test.com',
      name: 'Owner',
    });

    await service.cancelBooking(
      'booking-1',
      ownerUser,
      'CHANGE_OF_PLANS',
      'I have a schedule conflict',
    );

    expect(paymentsMock.expireStripeSession).toHaveBeenCalledTimes(1);
  });

  it('should skip Stripe expiry when no stripe_session_id', async () => {
    const noStripe = { ...PENDING_BOOKING, stripe_session_id: null };
    prismaMock.t_trx_bookings.findUnique.mockResolvedValue(noStripe);
    prismaMock.__tx.t_trx_bookings.findUnique.mockResolvedValue({
      ...CANCELLED_RESULT,
      stripe_session_id: null,
    });
    prismaMock.t_mtr_users.findUnique.mockResolvedValue({
      email: 'owner@test.com',
      name: 'Owner',
    });

    await service.cancelBooking(
      'booking-1',
      ownerUser,
      'CHANGE_OF_PLANS',
      'I have a schedule conflict',
    );

    expect(paymentsMock.expireStripeSession).not.toHaveBeenCalled();
  });

  // ── Failure scenarios ───────────────────────────────────────────

  it('should throw NotFoundException when booking does not exist', async () => {
    prismaMock.t_trx_bookings.findUnique.mockResolvedValue(null);

    await expect(
      service.cancelBooking('nonexistent', ownerUser, 'OTHER', 'test reason'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when caller is not owner or admin', async () => {
    prismaMock.t_trx_bookings.findUnique.mockResolvedValue(PENDING_BOOKING);

    await expect(
      service.cancelBooking('booking-1', otherUser, 'OTHER', 'test reason'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException when booking is CONFIRMED', async () => {
    prismaMock.t_trx_bookings.findUnique.mockResolvedValue({
      ...PENDING_BOOKING,
      status: 'CONFIRMED',
    });

    await expect(
      service.cancelBooking('booking-1', ownerUser, 'OTHER', 'test reason'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when booking is EXPIRED', async () => {
    prismaMock.t_trx_bookings.findUnique.mockResolvedValue({
      ...PENDING_BOOKING,
      status: 'EXPIRED',
    });

    await expect(
      service.cancelBooking('booking-1', ownerUser, 'OTHER', 'test reason'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when booking is already CANCELLED', async () => {
    prismaMock.t_trx_bookings.findUnique.mockResolvedValue({
      ...PENDING_BOOKING,
      status: 'CANCELLED',
    });

    await expect(
      service.cancelBooking('booking-1', ownerUser, 'OTHER', 'test reason'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw ConflictException when status changes during transaction (race)', async () => {
    prismaMock.t_trx_bookings.findUnique.mockResolvedValue(PENDING_BOOKING);
    // Simulate a concurrent process that changed status before our update
    prismaMock.__tx.t_trx_bookings.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.cancelBooking('booking-1', ownerUser, 'OTHER', 'test reason'),
    ).rejects.toThrow(ConflictException);
  });
});

describe('BookingsService — duplicate checkout guard', () => {
  let service: BookingsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  const EVENT = {
    id: 'event-1',
    title: 'Concert',
    currency: 'USD',
    base_price: 50,
    venue: { id: 'venue-1' },
  };
  const SEATS = [
    { id: 'seat-a', event_id: 'event-1', status: 'AVAILABLE', type: 'REGULAR' },
    { id: 'seat-b', event_id: 'event-1', status: 'AVAILABLE', type: 'REGULAR' },
  ];

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: createRedisMock() },
        { provide: PaymentsService, useValue: createPaymentsMock() },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: StripeService,
          useValue: { createCheckoutSession: jest.fn(), client: {} },
        },
        {
          provide: NotificationsService,
          useValue: { sendPaymentSuccess: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prismaMock.t_trx_events.findUnique.mockResolvedValue(EVENT);
    prismaMock.t_mtr_seats.findMany.mockResolvedValue(SEATS);
  });

  it('rejects a second checkout for an identical live PENDING selection', async () => {
    prismaMock.t_trx_bookings.findFirst.mockResolvedValue({
      id: 'booking-1',
      booking_code: 'BOK-123',
      seat_ids: ['seat-a', 'seat-b'],
    });

    await expect(
      service.checkout('user-1', 'event-1', ['seat-a', 'seat-b']),
    ).rejects.toThrow(/already in progress/);
  });

  it('allows checkout when the pending booking covers a larger selection', async () => {
    // hasEvery matches supersets too — a booking for 3 seats must not block a
    // fresh 2-seat checkout, so the guard compares the exact seat count.
    prismaMock.t_trx_bookings.findFirst.mockResolvedValue({
      id: 'booking-1',
      booking_code: 'BOK-123',
      seat_ids: ['seat-a', 'seat-b', 'seat-c'],
    });
    prismaMock.t_mtr_seats.findMany.mockResolvedValue([
      { ...SEATS[0], status: 'RESERVED' },
      SEATS[1],
    ]);

    await expect(
      service.checkout('user-1', 'event-1', ['seat-a', 'seat-b']),
    ).rejects.toThrow(/no longer available/);
  });
});
