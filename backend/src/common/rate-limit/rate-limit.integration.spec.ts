import Fastify, { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { Logger } from '@nestjs/common';
import { buildRateLimitOptions, RateLimitConfigEnvReader } from './rate-limit.config';

/**
 * Integration test — GAP-13 Webhook Rate Limit Isolation.
 *
 * Boots a REAL Fastify instance wired with the production rate-limit options
 * factory (buildRateLimitOptions) and verifies end-to-end behavior using
 * fastify.inject (no network sockets required):
 *   1. Stripe webhook survives a burst above the global 100/min threshold.
 *   2. Webhook gets its own dedicated quota and returns 429 + Retry-After
 *      only when ITS OWN limit is exceeded.
 *   3. Webhook traffic and global API traffic never consume each other's
 *      quota (namespaced keys).
 *   4. Global API still enforces its standard limit.
 */
describe('Rate limit integration (GAP-13) — Stripe webhook isolation', () => {
  let app: FastifyInstance;
  let warnSpy: jest.SpyInstance;

  // Small limits so the burst test stays fast; ratios mirror production
  // defaults (webhook 1000/min vs global 100/min).
  const TEST_GLOBAL_MAX = 5;
  const TEST_WEBHOOK_MAX = 8;

  beforeAll(async () => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    const mockConfig: RateLimitConfigEnvReader = {
      get: jest.fn((key: string) => {
        if (key === 'RATE_LIMIT_GLOBAL_MAX') return String(TEST_GLOBAL_MAX);
        if (key === 'WEBHOOK_RATE_LIMIT_MAX') return String(TEST_WEBHOOK_MAX);
        return undefined;
      }) as any,
    };

    const { options } = buildRateLimitOptions(mockConfig);

    app = Fastify();
    await app.register(rateLimit, options as any);

    // Mirror the real webhook controller contract (path + payload shape).
    app.post('/payments/stripe/webhook', async () => ({ received: true }));
    // Representative global API endpoint.
    app.get('/api/v1/events', async () => ({ ok: true }));

    await app.ready();
  });

  afterAll(async () => {
    warnSpy.mockRestore();
    await app.close();
  });

  it('delivers every webhook under the dedicated webhook quota (no 429)', async () => {
    for (let i = 1; i <= TEST_WEBHOOK_MAX; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/payments/stripe/webhook',
        payload: { id: `evt_test_${i}`, type: 'checkout.session.completed' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ received: true });
    }
  });

  it('rejects the webhook request that exceeds its OWN quota with 429 + Retry-After', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/payments/stripe/webhook',
      payload: { id: 'evt_test_overflow', type: 'checkout.session.completed' },
    });

    expect(res.statusCode).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
    const body = res.json();
    expect(body.statusCode).toBe(429);
    expect(body.error).toBe('Too Many Requests');
    expect(body.message).toContain('webhook processing');
    // Structured alert was logged for monitoring (onExceeded hook).
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WebhookRateLimiter] Rate limit EXCEEDED for Stripe Webhook'),
    );
  });

  it('keeps global API quota untouched by webhook burst (key isolation)', async () => {
    // Same client IP as the webhook burst above; namespaced keys must
    // guarantee a fresh global counter.
    const res = await app.inject({ method: 'GET', url: '/api/v1/events' });
    expect(res.statusCode).toBe(200);
  });

  it('still enforces the standard limit on global API endpoints', async () => {
    // 1 request already consumed in the previous test; exhaust the rest.
    for (let i = 2; i <= TEST_GLOBAL_MAX; i++) {
      const res = await app.inject({ method: 'GET', url: '/api/v1/events' });
      expect(res.statusCode).toBe(200);
    }

    const rejected = await app.inject({ method: 'GET', url: '/api/v1/events' });
    expect(rejected.statusCode).toBe(429);
    expect(rejected.json().message).toContain(`retry in`);
  });
});
