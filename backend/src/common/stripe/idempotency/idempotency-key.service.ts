import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { IdempotencyContext } from '../interfaces/idempotency.interface';
import {
  FINGERPRINT_HASH_LENGTH,
  IDEMPOTENCY_PREFIX,
  MAX_IDEMPOTENCY_KEY_LENGTH,
} from './idempotency.constants';

/**
 * Generates deterministic idempotency keys from business context.
 *
 * Single responsibility: turn an {@link IdempotencyContext} into a stable
 * string. It performs no I/O and never talks to Stripe or the database.
 *
 * Key format: `{prefix}_{entityId}[_{discriminator}][_{fingerprintHash}]`
 * e.g. `chk_cku123_1_9f2a1b3c4d5e`
 */
@Injectable()
export class IdempotencyKeyService {
  /**
   * Build a deterministic key. Identical context always yields the same key;
   * changing the fingerprint (payload) or discriminator yields a new one.
   */
  generate(ctx: IdempotencyContext): string {
    const prefix = IDEMPOTENCY_PREFIX[ctx.operation];
    const parts: string[] = [prefix, ctx.entityId];

    if (ctx.discriminator) {
      parts.push(this.sanitize(ctx.discriminator));
    }

    if (ctx.fingerprint) {
      parts.push(this.hashFingerprint(ctx.fingerprint));
    }

    const key = parts.join('_');
    if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      // Extremely unlikely, but never send an over-length key to Stripe.
      return key.slice(0, MAX_IDEMPOTENCY_KEY_LENGTH);
    }
    return key;
  }

  /**
   * Hash the fingerprint into a short, stable hex string. Keys are sorted so
   * property order does not affect the result.
   */
  private hashFingerprint(fingerprint: Record<string, unknown>): string {
    const canonical = JSON.stringify(fingerprint, Object.keys(fingerprint).sort());
    return createHash('sha256')
      .update(canonical)
      .digest('hex')
      .slice(0, FINGERPRINT_HASH_LENGTH);
  }

  /** Strip characters that are not safe/readable inside a key segment. */
  private sanitize(value: string): string {
    return value.replace(/[^a-zA-Z0-9-]/g, '');
  }
}
