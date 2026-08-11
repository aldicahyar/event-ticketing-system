import { DisputeStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { DisputesRepository } from './disputes.repository';

function createPrismaMock() {
  const tx = {
    t_trx_disputes: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    t_trx_payments: { findUnique: jest.fn(), updateMany: jest.fn() },
    t_trx_bookings: { updateMany: jest.fn() },
    t_trx_tickets: { updateMany: jest.fn() },
    t_mtr_seats: { updateMany: jest.fn() },
    t_trx_security_logs: { create: jest.fn() },
  };
  return {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    __tx: tx,
  } as unknown as PrismaService & { __tx: typeof tx };
}

describe('DisputesRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: DisputesRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new DisputesRepository(prisma);
  });

  it('opens atomically, revokes tickets, retains seats, and writes audit', async () => {
    prisma.__tx.t_trx_disputes.findUnique.mockResolvedValue(null);
    prisma.__tx.t_trx_payments.findUnique.mockResolvedValue({
      id: 'payment-1',
      booking_id: 'booking-1',
      booking: { user_id: 'user-1' },
    });
    prisma.__tx.t_trx_disputes.create.mockResolvedValue({ id: 'dispute-1' });

    await repository.applyOpened({
      stripe_dispute_id: 'dp_1',
      paymentId: 'payment-1',
      amount: 100,
      currency: 'USD',
    });

    expect(prisma.__tx.t_mtr_seats.updateMany).not.toHaveBeenCalled();
    expect(prisma.__tx.t_trx_tickets.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revoked_reason: 'PAYMENT_DISPUTED' }),
      }),
    );
    expect(prisma.__tx.t_trx_security_logs.create).toHaveBeenCalled();
  });

  it('is idempotent on dispute.created redelivery', async () => {
    prisma.__tx.t_trx_disputes.findUnique.mockResolvedValue({ id: 'dispute-1' });

    const result = await repository.applyOpened({
      stripe_dispute_id: 'dp_1',
      paymentId: 'payment-1',
      amount: 100,
      currency: 'USD',
    });

    expect(result).toEqual({
      dispute: { id: 'dispute-1' },
      created: false,
    });
    expect(prisma.__tx.t_trx_payments.findUnique).not.toHaveBeenCalled();
    expect(prisma.__tx.t_trx_security_logs.create).not.toHaveBeenCalled();
  });

  it('won restores payment, booking and disputed tickets without releasing seats', async () => {
    prisma.__tx.t_trx_disputes.findUnique.mockResolvedValue({
      id: 'dispute-1',
      payment_id: 'payment-1',
      booking_id: 'booking-1',
      stripe_dispute_id: 'dp_1',
      status: DisputeStatus.OPEN,
      booking: { user_id: 'user-1' },
    });
    prisma.__tx.t_trx_disputes.update.mockResolvedValue({ status: DisputeStatus.WON });

    await repository.close('dispute-1', DisputeStatus.WON);

    expect(prisma.__tx.t_trx_tickets.updateMany).toHaveBeenCalledWith({
      where: { booking_id: 'booking-1', revoked_reason: 'PAYMENT_DISPUTED' },
      data: { revoked_at: null, revoked_reason: null },
    });
    expect(prisma.__tx.t_mtr_seats.updateMany).not.toHaveBeenCalled();
  });

  it('lost alone releases seats and records audit atomically', async () => {
    prisma.__tx.t_trx_disputes.findUnique.mockResolvedValue({
      id: 'dispute-1',
      payment_id: 'payment-1',
      booking_id: 'booking-1',
      stripe_dispute_id: 'dp_1',
      status: DisputeStatus.OPEN,
      booking: { user_id: 'user-1' },
    });
    prisma.__tx.t_trx_disputes.update.mockResolvedValue({ status: DisputeStatus.LOST });

    await repository.close('dispute-1', DisputeStatus.LOST);

    expect(prisma.__tx.t_mtr_seats.updateMany).toHaveBeenCalledWith({
      where: { booking_id: 'booking-1' },
      data: { booking_id: null, status: 'AVAILABLE' },
    });
    expect(prisma.__tx.t_trx_security_logs.create).toHaveBeenCalled();
  });

  it('does not repeat lifecycle writes for terminal redelivery', async () => {
    prisma.__tx.t_trx_disputes.findUnique.mockResolvedValue({
      id: 'dispute-1',
      status: DisputeStatus.LOST,
      booking: { user_id: 'user-1' },
    });
    prisma.__tx.t_trx_disputes.findUniqueOrThrow.mockResolvedValue({
      status: DisputeStatus.LOST,
    });

    await repository.close('dispute-1', DisputeStatus.LOST);

    expect(prisma.__tx.t_mtr_seats.updateMany).not.toHaveBeenCalled();
    expect(prisma.__tx.t_trx_security_logs.create).not.toHaveBeenCalled();
  });
});
