import { IdempotencyKeyService } from './idempotency-key.service';
import { MAX_IDEMPOTENCY_KEY_LENGTH } from './idempotency.constants';

describe('IdempotencyKeyService', () => {
  let service: IdempotencyKeyService;

  beforeEach(() => {
    service = new IdempotencyKeyService();
  });

  it('produces the same key for identical context (deterministic)', () => {
    const ctx = {
      operation: 'checkout' as const,
      entityId: 'booking-1',
      discriminator: '1',
      fingerprint: { amount: 1000, currency: 'usd' },
    };
    expect(service.generate(ctx)).toBe(service.generate(ctx));
  });

  it('changes the key when the fingerprint changes (closes T-02)', () => {
    const base = {
      operation: 'checkout' as const,
      entityId: 'booking-1',
      discriminator: '1',
    };
    const a = service.generate({ ...base, fingerprint: { amount: 1000 } });
    const b = service.generate({ ...base, fingerprint: { amount: 2000 } });
    expect(a).not.toBe(b);
  });

  it('is stable regardless of fingerprint property order', () => {
    const a = service.generate({
      operation: 'refund',
      entityId: 'pay-1',
      fingerprint: { a: 1, b: 2 },
    });
    const b = service.generate({
      operation: 'refund',
      entityId: 'pay-1',
      fingerprint: { b: 2, a: 1 },
    });
    expect(a).toBe(b);
  });

  it('uses the correct prefix per operation', () => {
    expect(service.generate({ operation: 'checkout', entityId: 'x' })).toMatch(/^chk_/);
    expect(service.generate({ operation: 'refund', entityId: 'x' })).toMatch(/^rfd_/);
    expect(service.generate({ operation: 'expire', entityId: 'x' })).toMatch(/^exp_/);
  });

  it('changes the key when the discriminator (attempt) changes', () => {
    const a = service.generate({ operation: 'checkout', entityId: 'b1', discriminator: '1' });
    const b = service.generate({ operation: 'checkout', entityId: 'b1', discriminator: '2' });
    expect(a).not.toBe(b);
  });

  it('never exceeds the Stripe key length limit', () => {
    const key = service.generate({
      operation: 'checkout',
      entityId: 'x'.repeat(400),
      discriminator: 'y'.repeat(400),
      fingerprint: { z: 'w'.repeat(400) },
    });
    expect(key.length).toBeLessThanOrEqual(MAX_IDEMPOTENCY_KEY_LENGTH);
  });

  it('does not embed PII from the fingerprint verbatim (hashed)', () => {
    const key = service.generate({
      operation: 'checkout',
      entityId: 'b1',
      fingerprint: { email: 'secret@example.com' },
    });
    expect(key).not.toContain('secret@example.com');
  });
});
