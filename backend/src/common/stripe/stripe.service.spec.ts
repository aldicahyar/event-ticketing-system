import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { IdempotencyKeyService } from './idempotency/idempotency-key.service';
import { IdempotencyStoreService } from './idempotency/idempotency-store.service';

const configMock = {
  get: jest.fn((key: string) => {
    if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock';
    if (key === 'STRIPE_API_VERSION') return '2023-10-16';
    return undefined;
  }),
} as unknown as ConfigService;

function createStoreMock() {
  return {
    reserve: jest.fn().mockResolvedValue(null),
    complete: jest.fn().mockResolvedValue(undefined),
    fail: jest.fn().mockResolvedValue(undefined),
  } as unknown as IdempotencyStoreService;
}

describe('StripeService', () => {
  let service: StripeService;
  let store: ReturnType<typeof createStoreMock>;

  beforeEach(() => {
    store = createStoreMock();
    service = new StripeService(configMock, new IdempotencyKeyService(), store);
  });

  it('throws if STRIPE_SECRET_KEY is missing', () => {
    const badConfig = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    expect(
      () => new StripeService(badConfig, new IdempotencyKeyService(), store),
    ).toThrow('STRIPE_SECRET_KEY');
  });

  it('passes an idempotency key to checkout.sessions.create', async () => {
    const createSpy = jest
      .spyOn(service.client.checkout.sessions, 'create')
      .mockResolvedValue({ id: 'cs_1' } as any);

    await service.createCheckoutSession({} as any, {
      operation: 'checkout',
      entityId: 'b1',
      discriminator: '1',
    });

    expect(createSpy).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ idempotencyKey: expect.stringMatching(/^chk_b1/) }),
    );
    expect(store.complete).toHaveBeenCalledWith(expect.any(String), 'cs_1');
  });

  it('passes an idempotency key to refunds.create', async () => {
    const createSpy = jest
      .spyOn(service.client.refunds, 'create')
      .mockResolvedValue({ id: 're_1' } as any);

    await service.createRefund({} as any, {
      operation: 'refund',
      entityId: 'pay-1',
      discriminator: 'PAYMENT_AFTER_EXPIRY',
    });

    expect(createSpy).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ idempotencyKey: expect.stringMatching(/^rfd_pay-1/) }),
    );
  });

  it('replays the stored resource when a COMPLETED record exists', async () => {
    (store.reserve as jest.Mock).mockResolvedValue({
      status: 'COMPLETED',
      resourceId: 'cs_existing',
    });
    const createSpy = jest.spyOn(service.client.checkout.sessions, 'create');
    const retrieveSpy = jest
      .spyOn(service.client.checkout.sessions, 'retrieve')
      .mockResolvedValue({ id: 'cs_existing' } as any);

    const result = await service.createCheckoutSession({} as any, {
      operation: 'checkout',
      entityId: 'b1',
    });

    expect(createSpy).not.toHaveBeenCalled();
    expect(retrieveSpy).toHaveBeenCalledWith('cs_existing');
    expect(result.id).toBe('cs_existing');
  });

  it('marks the key FAILED and rethrows when Stripe errors', async () => {
    jest
      .spyOn(service.client.checkout.sessions, 'create')
      .mockRejectedValue(new Error('stripe down'));

    await expect(
      service.createCheckoutSession({} as any, { operation: 'checkout', entityId: 'b1' }),
    ).rejects.toThrow('stripe down');
    expect(store.fail).toHaveBeenCalled();
  });

  it('bypasses idempotency entirely when IDEMPOTENCY_ENABLED=false', async () => {
    const disabledConfig = {
      get: jest.fn((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock';
        if (key === 'IDEMPOTENCY_ENABLED') return 'false';
        return undefined;
      }),
    } as unknown as ConfigService;
    const disabled = new StripeService(
      disabledConfig,
      new IdempotencyKeyService(),
      store,
    );
    const createSpy = jest
      .spyOn(disabled.client.checkout.sessions, 'create')
      .mockResolvedValue({ id: 'cs_2' } as any);

    await disabled.createCheckoutSession({} as any, {
      operation: 'checkout',
      entityId: 'b1',
    });

    expect(createSpy).toHaveBeenCalledWith({}, {});
    expect(store.reserve).not.toHaveBeenCalled();
    expect(store.complete).not.toHaveBeenCalled();
  });
});
