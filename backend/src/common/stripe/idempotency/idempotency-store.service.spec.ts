import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { IdempotencyStoreService } from './idempotency-store.service';

function uniqueViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('dup', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

function createPrismaMock() {
  return {
    t_trx_idempotency_keys: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

const configMock = { get: jest.fn().mockReturnValue('24') } as unknown as ConfigService;

describe('IdempotencyStoreService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: IdempotencyStoreService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new IdempotencyStoreService(prisma as any, configMock);
  });

  it('reserve returns null on a fresh key (caller proceeds)', async () => {
    prisma.t_trx_idempotency_keys.create.mockResolvedValue({});
    const result = await service.reserve('chk_1', 'checkout', 'b1');
    expect(result).toBeNull();
    expect(prisma.t_trx_idempotency_keys.create).toHaveBeenCalled();
  });

  it('reserve replays a COMPLETED record', async () => {
    prisma.t_trx_idempotency_keys.create.mockRejectedValue(uniqueViolation());
    prisma.t_trx_idempotency_keys.findUnique.mockResolvedValue({
      status: 'COMPLETED',
      resource_id: 'cs_existing',
    });
    const result = await service.reserve('chk_1', 'checkout', 'b1');
    expect(result).toEqual({ status: 'COMPLETED', resourceId: 'cs_existing' });
  });

  it('reserve throws 409 when a request is IN_FLIGHT (fail-closed, T-04)', async () => {
    prisma.t_trx_idempotency_keys.create.mockRejectedValue(uniqueViolation());
    prisma.t_trx_idempotency_keys.findUnique.mockResolvedValue({
      status: 'IN_FLIGHT',
      resource_id: null,
    });
    await expect(service.reserve('chk_1', 'checkout', 'b1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('reserve resets a FAILED record and allows retry', async () => {
    prisma.t_trx_idempotency_keys.create.mockRejectedValue(uniqueViolation());
    prisma.t_trx_idempotency_keys.findUnique.mockResolvedValue({
      status: 'FAILED',
      resource_id: null,
    });
    const result = await service.reserve('chk_1', 'checkout', 'b1');
    expect(result).toBeNull();
    expect(prisma.t_trx_idempotency_keys.updateMany).toHaveBeenCalled();
  });

  it('reserve is fail-open on a non-unique DB error', async () => {
    prisma.t_trx_idempotency_keys.create.mockRejectedValue(new Error('db down'));
    const result = await service.reserve('chk_1', 'checkout', 'b1');
    expect(result).toBeNull();
  });

  it('complete marks the record COMPLETED with resource id', async () => {
    await service.complete('chk_1', 'cs_123');
    expect(prisma.t_trx_idempotency_keys.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idempotency_key: 'chk_1' },
        data: expect.objectContaining({ status: 'COMPLETED', resource_id: 'cs_123' }),
      }),
    );
  });

  it('fail marks the record FAILED with the error message', async () => {
    await service.fail('chk_1', 'boom');
    expect(prisma.t_trx_idempotency_keys.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED', error_message: 'boom' }),
      }),
    );
  });
});
