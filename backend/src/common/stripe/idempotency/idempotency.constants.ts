/**
 * Constants for idempotency key generation and storage.
 */

/** Key prefixes per Stripe operation (see IdempotencyContext.operation). */
export const IDEMPOTENCY_PREFIX = {
  checkout: 'chk',
  refund: 'rfd',
  expire: 'exp',
} as const;

/**
 * Stripe rejects idempotency keys longer than 255 characters. We stay well
 * under that limit; this constant guards the generator against accidental
 * overflow when entity ids are unexpectedly long.
 */
export const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

/** Number of hex characters kept from the payload fingerprint hash. */
export const FINGERPRINT_HASH_LENGTH = 12;

/** Default record TTL in hours (aligned with Stripe's 24h key lifetime). */
export const DEFAULT_IDEMPOTENCY_TTL_HOURS = 24;

/** Config key for overriding the record TTL. */
export const IDEMPOTENCY_TTL_CONFIG_KEY = 'IDEMPOTENCY_KEY_TTL_HOURS';
