import { resolvePaymentIntentId } from './stripe.utils';

/**
 * Unit tests for `resolvePaymentIntentId` — the shared Session→PaymentIntent
 * extractor that eliminates the three previous inline implementations
 * (payments, refunds, admin ops).
 */
describe('stripe.utils / resolvePaymentIntentId', () => {
  it('returns the PI id when payment_intent is a plain string id', () => {
    expect(resolvePaymentIntentId({ payment_intent: 'pi_123ABC' })).toBe('pi_123ABC');
  });

  it('returns the PI id when payment_intent is an expanded object', () => {
    const session = { payment_intent: { id: 'pi_456DEF', status: 'succeeded' } as any };
    expect(resolvePaymentIntentId(session)).toBe('pi_456DEF');
  });

  it('returns null when payment_intent is null', () => {
    expect(resolvePaymentIntentId({ payment_intent: null })).toBeNull();
  });

  it('returns null when session is null or undefined', () => {
    expect(resolvePaymentIntentId(null)).toBeNull();
    expect(resolvePaymentIntentId(undefined)).toBeNull();
  });

  it('returns null when payment_intent is an empty string', () => {
    expect(resolvePaymentIntentId({ payment_intent: '' })).toBeNull();
  });

  it('returns null when payment_intent object has no id', () => {
    expect(resolvePaymentIntentId({ payment_intent: {} as never })).toBeNull();
  });
});
