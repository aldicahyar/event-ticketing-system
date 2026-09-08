import { FastifyRequest } from 'fastify';
import { Logger } from '@nestjs/common';
import {
  isStripeWebhookUrl,
  parsePositiveInt,
  buildRateLimitOptions,
  DEFAULT_GLOBAL_RATE_LIMIT_MAX,
  DEFAULT_WEBHOOK_RATE_LIMIT_MAX,
  STRIPE_WEBHOOK_PATH,
  RateLimitConfigEnvReader,
} from './rate-limit.config';

describe('Rate Limit Config (GAP-13)', () => {
  describe('isStripeWebhookUrl', () => {
    it('returns true for exact webhook path', () => {
      expect(isStripeWebhookUrl(STRIPE_WEBHOOK_PATH)).toBe(true);
      expect(isStripeWebhookUrl('/payments/stripe/webhook')).toBe(true);
    });

    it('returns true when query params are present', () => {
      expect(isStripeWebhookUrl('/payments/stripe/webhook?timestamp=123')).toBe(true);
    });

    it('returns true for prefixed API paths', () => {
      expect(isStripeWebhookUrl('/api/v1/payments/stripe/webhook')).toBe(true);
    });

    it('returns false for unrelated paths', () => {
      expect(isStripeWebhookUrl('/api/v1/auth/login')).toBe(false);
      expect(isStripeWebhookUrl('/payments/verify-session')).toBe(false);
      expect(isStripeWebhookUrl('/events')).toBe(false);
      expect(isStripeWebhookUrl(undefined)).toBe(false);
      expect(isStripeWebhookUrl('')).toBe(false);
    });
  });

  describe('parsePositiveInt', () => {
    it('returns number when positive integer is passed', () => {
      expect(parsePositiveInt(500, 100)).toBe(500);
      expect(parsePositiveInt('2000', 100)).toBe(2000);
    });

    it('returns fallback for invalid or non-positive values', () => {
      expect(parsePositiveInt(0, 100)).toBe(100);
      expect(parsePositiveInt(-5, 100)).toBe(100);
      expect(parsePositiveInt('invalid', 100)).toBe(100);
      expect(parsePositiveInt(null, 100)).toBe(100);
      expect(parsePositiveInt(undefined, 100)).toBe(100);
    });
  });

  describe('buildRateLimitOptions', () => {
    it('uses defaults when config has no overrides', () => {
      const mockConfig: RateLimitConfigEnvReader = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const result = buildRateLimitOptions(mockConfig);
      expect(result.globalMax).toBe(DEFAULT_GLOBAL_RATE_LIMIT_MAX);
      expect(result.webhookMax).toBe(DEFAULT_WEBHOOK_RATE_LIMIT_MAX);
      expect(result.options.global).toBe(true);
    });

    it('respects environment overrides', () => {
      const mockConfig: RateLimitConfigEnvReader = {
        get: jest.fn((key: string) => {
          if (key === 'RATE_LIMIT_GLOBAL_MAX') return '50';
          if (key === 'WEBHOOK_RATE_LIMIT_MAX') return '1500';
          if (key === 'RATE_LIMIT_WINDOW') return '2 minutes';
          return undefined;
        }) as any,
      };

      const result = buildRateLimitOptions(mockConfig);
      expect(result.globalMax).toBe(50);
      expect(result.webhookMax).toBe(1500);
      expect(result.timeWindow).toBe('2 minutes');
    });

    it('provides dynamic max handler that gives 1000 to webhook and 100 to standard API', () => {
      const mockConfig: RateLimitConfigEnvReader = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const { options } = buildRateLimitOptions(mockConfig);
      const maxFn = options.max as (req: FastifyRequest) => number;

      const webhookReq = { url: '/payments/stripe/webhook' } as FastifyRequest;
      const apiReq = { url: '/api/v1/bookings' } as FastifyRequest;

      expect(maxFn(webhookReq)).toBe(1000);
      expect(maxFn(apiReq)).toBe(100);
    });

    it('segregates keys between webhook and global requests to prevent cross-contamination', () => {
      const mockConfig: RateLimitConfigEnvReader = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const { options } = buildRateLimitOptions(mockConfig);
      const keyGen = options.keyGenerator as (req: FastifyRequest) => string;

      const webhookReq = {
        url: '/payments/stripe/webhook',
        ip: '192.168.1.10',
      } as FastifyRequest;
      const apiReq = { url: '/api/v1/events', ip: '192.168.1.10' } as FastifyRequest;

      expect(keyGen(webhookReq)).toBe('webhook:192.168.1.10');
      expect(keyGen(apiReq)).toBe('global:192.168.1.10');
    });

    it('formats errorResponseBuilder with specific messaging for webhook vs global', () => {
      const mockConfig: RateLimitConfigEnvReader = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const { options } = buildRateLimitOptions(mockConfig);
      const builder = options.errorResponseBuilder as any;

      const webhookRes = builder({ url: '/payments/stripe/webhook' } as FastifyRequest, {
        after: '30 seconds',
      });
      expect(webhookRes).toMatchObject({
        statusCode: 429,
        error: 'Too Many Requests',
        message: expect.stringContaining('webhook processing'),
        retryAfter: '30 seconds',
      });

      const normalRes = builder({ url: '/api/v1/auth/login' } as FastifyRequest, {
        after: '1 minute',
      });
      expect(normalRes).toMatchObject({
        statusCode: 429,
        message: expect.stringContaining('retry in 1 minute'),
      });
    });

    it('triggers structured log warning when webhook rate limit is exceeded', () => {
      const mockConfig: RateLimitConfigEnvReader = {
        get: jest.fn().mockReturnValue(undefined),
      };
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

      const { options } = buildRateLimitOptions(mockConfig);
      const onExceeded = options.onExceeded as any;

      onExceeded(
        { url: '/payments/stripe/webhook', ip: '54.187.174.169' } as FastifyRequest,
        'webhook:54.187.174.169',
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WebhookRateLimiter] Rate limit EXCEEDED for Stripe Webhook'),
      );
      warnSpy.mockRestore();
    });
  });
});
