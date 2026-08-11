/**
 * Business context used to deterministically derive an idempotency key for a
 * Stripe write operation. The generated key is stable across retries of the
 * *same* logical request, so Stripe (and our local store) can safely replay
 * the original result instead of executing the operation twice.
 */
export interface IdempotencyContext {
  /** Stripe operation type. Determines the key prefix. */
  operation:
    | 'checkout'
    | 'refund'
    | 'expire'
    | 'dispute_evidence'
    | 'dispute_update'
    | 'dispute_close';

  /** Business entity id: booking_id | payment_id | session_id. */
  entityId: string;

  /**
   * Retry attempt (checkout) or reason code (refund). Bumping this value
   * produces a fresh key, allowing a legitimately new operation (e.g. a new
   * checkout after the previous session expired).
   */
  discriminator?: string;

  /**
   * Payload fields that, when changed, MUST produce a new key. Hashed into the
   * key so that Stripe does not reject a reused key with a different payload
   * (Stripe returns an idempotency_error in that case).
   */
  fingerprint?: Record<string, unknown>;
}
