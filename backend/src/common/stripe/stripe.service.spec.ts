import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { IdempotencyKeyService } from './idempotency/idempotency-key.service';
import { IdempotencyStoreService } from './idempotency/idempotency-store.service';

const configMock = {
  get: jest.fn((key: string) => {
    if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock';
    if (key === 'STRIPE_API_VERSION') return '2023-10-16';
    if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_mock';
    return undefined;
  }),
} as unknown as ConfigService;

/**
 * Test-only accessor for the encapsulated SDK instance. GAP-14 made the raw
 * client private on purpose — specs reach in via this cast to spy on the SDK
 * surface the curated methods delegate to.
 */
function sdk(service: StripeService): Stripe {
  return (service as unknown as { stripe: Stripe }).stripe;
}

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
    expect(() => new StripeService(badConfig, new IdempotencyKeyService(), store)).toThrow(
      'STRIPE_SECRET_KEY',
    );
  });

  it('passes an idempotency key to checkout.sessions.create', async () => {
    const createSpy = jest
      .spyOn(sdk(service).checkout.sessions, 'create')
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
      .spyOn(sdk(service).refunds, 'create')
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
    const createSpy = jest.spyOn(sdk(service).checkout.sessions, 'create');
    const retrieveSpy = jest
      .spyOn(sdk(service).checkout.sessions, 'retrieve')
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
      .spyOn(sdk(service).checkout.sessions, 'create')
      .mockRejectedValue(new Error('stripe down'));

    await expect(
      service.createCheckoutSession({} as any, { operation: 'checkout', entityId: 'b1' }),
    ).rejects.toThrow('stripe down');
    expect(store.fail).toHaveBeenCalled();
  });

  it('passes typed idempotency options to dispute update, close, and upload', async () => {
    const updateSpy = jest
      .spyOn(sdk(service).disputes, 'update')
      .mockResolvedValue({ id: 'dp_1' } as never);
    const closeSpy = jest
      .spyOn(sdk(service).disputes, 'close')
      .mockResolvedValue({ id: 'dp_1' } as never);
    const uploadSpy = jest
      .spyOn(sdk(service).files, 'create')
      .mockResolvedValue({ id: 'file_1' } as never);

    await service.updateDispute(
      'dp_1',
      { evidence: { receipt: 'file_1' }, submit: true },
      { operation: 'dispute_update', entityId: 'dispute-1' },
    );
    await service.closeDispute('dp_1', {
      operation: 'dispute_close',
      entityId: 'dispute-1',
    });
    await service.uploadDisputeEvidence(
      {
        purpose: 'dispute_evidence',
        file: { data: Buffer.from('%PDF-'), name: 'receipt.pdf' },
      },
      { operation: 'dispute_evidence', entityId: 'dispute-1' },
    );

    expect(updateSpy).toHaveBeenCalledWith(
      'dp_1',
      { evidence: { receipt: 'file_1' }, submit: true },
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
    expect(closeSpy).toHaveBeenCalledWith(
      'dp_1',
      {},
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
    expect(uploadSpy).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'dispute_evidence' }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
  });

  it('bypasses idempotency entirely when IDEMPOTENCY_ENABLED=false', async () => {
    const disabledConfig = {
      get: jest.fn((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock';
        if (key === 'IDEMPOTENCY_ENABLED') return 'false';
        return undefined;
      }),
    } as unknown as ConfigService;
    const disabled = new StripeService(disabledConfig, new IdempotencyKeyService(), store);
    const createSpy = jest
      .spyOn(sdk(disabled).checkout.sessions, 'create')
      .mockResolvedValue({ id: 'cs_2' } as any);

    await disabled.createCheckoutSession({} as any, {
      operation: 'checkout',
      entityId: 'b1',
    });

    expect(createSpy).toHaveBeenCalledWith({}, {});
    expect(store.reserve).not.toHaveBeenCalled();
    expect(store.complete).not.toHaveBeenCalled();
  });

  describe('constructWebhookEvent', () => {
    it('throws when STRIPE_WEBHOOK_SECRET is not configured', () => {
      const badConfig = {
        get: jest.fn((key: string) => (key === 'STRIPE_SECRET_KEY' ? 'sk_test_mock' : undefined)),
      } as unknown as ConfigService;
      const noSecret = new StripeService(badConfig, new IdempotencyKeyService(), store);

      expect(() => noSecret.constructWebhookEvent(Buffer.from('{}'), 'sig')).toThrow(
        'STRIPE_WEBHOOK_SECRET is not configured',
      );
    });

    it('delegates to stripe.webhooks.constructEvent with the configured secret', () => {
      const constructSpy = jest
        .spyOn(sdk(service).webhooks, 'constructEvent')
        .mockReturnValue({ id: 'evt_1' } as never);

      const body = Buffer.from('{"id":"evt_1"}');
      const result = service.constructWebhookEvent(body, 'sig_abc');

      expect(constructSpy).toHaveBeenCalledWith(body, 'sig_abc', 'whsec_mock');
      expect(result.id).toBe('evt_1');
    });
  });

  it('delegates retrievePaymentIntent with expand params', async () => {
    const retrieveSpy = jest
      .spyOn(sdk(service).paymentIntents, 'retrieve')
      .mockResolvedValue({ id: 'pi_1' } as never);

    await service.retrievePaymentIntent('pi_1', { expand: ['latest_charge'] });

    expect(retrieveSpy).toHaveBeenCalledWith('pi_1', { expand: ['latest_charge'] });
  });

  it('delegates listBalanceTransactions with list params', async () => {
    const listSpy = jest
      .spyOn(sdk(service).balanceTransactions, 'list')
      .mockResolvedValue({ data: [], has_more: false } as never);

    await service.listBalanceTransactions({ created: { gte: 1 }, limit: 100 });

    expect(listSpy).toHaveBeenCalledWith({ created: { gte: 1 }, limit: 100 });
  });
});
