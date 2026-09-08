import { FastifyRequest } from 'fastify';
import { Logger } from '@nestjs/common';
import type { RateLimitPluginOptions } from '@fastify/rate-limit';

export const DEFAULT_GLOBAL_RATE_LIMIT_MAX = 100;
export const DEFAULT_GLOBAL_RATE_LIMIT_WINDOW = '1 minute';
export const DEFAULT_WEBHOOK_RATE_LIMIT_MAX = 1000;
export const DEFAULT_WEBHOOK_RATE_LIMIT_WINDOW = '1 minute';

export const STRIPE_WEBHOOK_PATH = '/payments/stripe/webhook';

/**
 * Checks whether the incoming request URL targets the Stripe webhook endpoint.
 * Handles exact matches, query strings, and optional prefixes (/api/v1/...).
 */
export function isStripeWebhookUrl(url: string | undefined): boolean {
  if (!url) return false;
  const cleanPath = url.split('?')[0];
  return (
    cleanPath === STRIPE_WEBHOOK_PATH ||
    cleanPath.endsWith(STRIPE_WEBHOOK_PATH)
  );
}

/**
 * Safely parses a non-negative integer from configuration values.
 */
export function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}

export interface RateLimitConfigEnvReader {
  get<T = any>(key: string, defaultValue?: T): T | undefined;
}

export interface WebhookRateLimitOptionsResult {
  options: RateLimitPluginOptions;
  globalMax: number;
  webhookMax: number;
  timeWindow: string;
}

/**
 * Builds Fastify rate-limit plugin configuration with dedicated high-capacity
 * quota for Stripe webhook endpoints, isolating them from the general API limit.
 */
export function buildRateLimitOptions(
  config: RateLimitConfigEnvReader,
  logger: Logger = new Logger('RateLimiter'),
): WebhookRateLimitOptionsResult {
  const globalMax = parsePositiveInt(
    config.get('RATE_LIMIT_GLOBAL_MAX') ?? config.get('RATE_LIMIT_MAX'),
    DEFAULT_GLOBAL_RATE_LIMIT_MAX,
  );
  const webhookMax = parsePositiveInt(
    config.get('WEBHOOK_RATE_LIMIT_MAX') ?? config.get('RATE_LIMIT_WEBHOOK_MAX'),
    DEFAULT_WEBHOOK_RATE_LIMIT_MAX,
  );

  const timeWindow =
    config.get<string>('RATE_LIMIT_WINDOW') ??
    config.get<string>('RATE_LIMIT_GLOBAL_WINDOW') ??
    DEFAULT_GLOBAL_RATE_LIMIT_WINDOW;

  const options: RateLimitPluginOptions = {
    global: true,
    timeWindow,
    // Dynamic max based on requested route: 1000 for webhook, 100 for others
    max: (req: FastifyRequest) => {
      return isStripeWebhookUrl(req.url) ? webhookMax : globalMax;
    },
    // Segregate webhook keys so webhooks never consume the global quota and vice versa
    keyGenerator: (req: FastifyRequest) => {
      const isWebhook = isStripeWebhookUrl(req.url);
      const clientIp = req.ip || '127.0.0.1';
      return isWebhook ? `webhook:${clientIp}` : `global:${clientIp}`;
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
    errorResponseBuilder: (req: FastifyRequest, context) => {
      const isWebhook = isStripeWebhookUrl(req.url);
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: isWebhook
          ? 'Rate limit exceeded for webhook processing. Please retry after the duration specified in Retry-After.'
          : 'Rate limit exceeded, retry in ' + context.after,
        retryAfter: context.after,
      };
    },
    onExceeded: (req: FastifyRequest, key: string) => {
      if (isStripeWebhookUrl(req.url)) {
        logger.warn(
          `[WebhookRateLimiter] Rate limit EXCEEDED for Stripe Webhook from IP: ${req.ip} | Key: ${key} | Max: ${webhookMax}`,
        );
      }
    },
  };

  return {
    options,
    globalMax,
    webhookMax,
    timeWindow,
  };
}
