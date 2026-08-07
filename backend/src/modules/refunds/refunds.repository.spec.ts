import { RefundStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { RefundsRepository } from './refunds.repository';

describe('RefundsRepository', () => {
  const refundRecord = {
    id: 'refund-1',
    booking_id: 'booking-1',
    payment_id: 'payment-1',
    status: RefundStatus.PROCESSING,
    completed_at: null,
  };

  function createRepository(status: RefundStatus = RefundStatus.PROCESSING) {
    const tx = {
      t_trx_refunds: {
        findUnique: jest.fn().mockResolvedValue({ ...refundRecord, status }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      t_trx_bookings: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      t_trx_payments: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      t_mtr_seats: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      t_trx_tickets: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    const prisma = {
      t_trx_refunds: {
        findFirst: jest.fn().mockResolvedValue({ ...refundRecord, status }),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (operation) => {
        if (typeof operation === 'function') return operation(tx);
        return Promise.all(operation);
      }),
    };
    return {
      repository: new RefundsRepository(prisma as unknown as PrismaService),
      prisma,
      tx,
    };
  }

  it('paginates and scopes organizer refund listings', async () => {
    const { repository, prisma } = createRepository();
    prisma.$transaction.mockResolvedValueOnce([21, []]);

    const result = await repository.findAll(RefundStatus.REQUESTED, 2, 10, 'organizer-1');

    expect(prisma.t_trx_refunds.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: {
          status: RefundStatus.REQUESTED,
          booking: { event: { organizer_id: 'organizer-1' } },
        },
      }),
    );
    expect(result.meta).toEqual(
      expect.objectContaining({ total: 21, page: 2, totalPages: 3, hasNext: true }),
    );
  });

  it('finalizes refund and dependent records in one transaction', async () => {
    const { repository, prisma, tx } = createRepository();

    await repository.finalizeRefund('refund-1', 're_1', 'Approved refund');

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(tx.t_trx_refunds.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripe_refund_id: 're_1',
          status: RefundStatus.COMPLETED,
        }),
      }),
    );
    expect(tx.t_trx_bookings.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.t_trx_payments.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.t_mtr_seats.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.t_trx_tickets.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('rejects finalization from an illegal status without dependent writes', async () => {
    const { repository, tx } = createRepository(RefundStatus.REJECTED);

    await expect(repository.finalizeRefund('refund-1', 're_1', 'Approved refund')).rejects.toThrow(
      'cannot be finalized from status REJECTED',
    );

    expect(tx.t_trx_refunds.updateMany).not.toHaveBeenCalled();
    expect(tx.t_trx_bookings.updateMany).not.toHaveBeenCalled();
    expect(tx.t_trx_payments.updateMany).not.toHaveBeenCalled();
  });
});
