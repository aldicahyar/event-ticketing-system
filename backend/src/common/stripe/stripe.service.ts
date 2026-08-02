import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { IdempotencyContext } from './interfaces/idempotency.interface';
import { IdempotencyKeyService } from './idempotency/idempotency-key.service';
import { IdempotencyStoreService } from './idempotency/idempotency-store.service';
import { IDEMPOTENCY_ENABLED_CONFIG_KEY } from './idempotency/idempotency.constants';

/**
 * Central owner of the Stripe SDK client and the single place where write
 * operations are performed. Every write (create/refund/expire) automatically
 * receives a deterministic Idempotency-Key, so callers cannot forget it — this
 * closes the root cause of GAP-05.
 *
 * Read operations (retrieve/list) are exposed as-is; they are naturally
 * idempotent and do not take an idempotency key.
 *
 * This service is also the sole instantiator of `new Stripe(...)`, unifying the
 * previously duplicated clients (partially addresses GAP-14).
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  /** Rollback switch: when false, Stripe calls run without idempotency keys. */
  private readonly idempotencyEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly keyService: IdempotencyKeyService,
    private readonly store: IdempotencyStoreService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is required to initialise the Stripe client',
      );
    }
    const apiVersion = (this.configService.get<string>('STRIPE_API_VERSION') ??
      '2023-10-16') as Stripe.LatestApiVersion;
    this.stripe = new Stripe(secretKey, { apiVersion });
    this.idempotencyEnabled =
      this.configService.get<string>(IDEMPOTENCY_ENABLED_CONFIG_KEY) !== 'false';
    if (!this.idempotencyEnabled) {
      this.logger.warn(
        'Idempotency is DISABLED via IDEMPOTENCY_ENABLED=false — Stripe writes run without keys',
      );
    }
  }

  /** Raw client for read-only operations that need the full SDK surface. */
  get client(): Stripe {
    return this.stripe;
  }

  /**
   * Create a Checkout Session with an idempotency key derived from `ctx`.
   * If a previous identical request already completed, the existing session is
   * returned instead of creating a duplicate.
   */
  async createCheckoutSession(
    params: Stripe.Checkout.SessionCreateParams,
    ctx: IdempotencyContext,
  ): Promise<Stripe.Checkout.Session> {
    return this.runIdempotent(ctx, (options) =>
      this.stripe.checkout.sessions.create(params, options),
      (resourceId) => this.stripe.checkout.sessions.retrieve(resourceId),
    );
  }

  /**
   * Create a refund with an idempotency key. Retried refund requests for the
   * same payment + reason do not issue money twice.
   */
  async createRefund(
    params: Stripe.RefundCreateParams,
    ctx: IdempotencyContext,
  ): Promise<Stripe.Refund> {
    return this.runIdempotent(ctx, (options) =>
      this.stripe.refunds.create(params, options),
      (resourceId) => this.stripe.refunds.retrieve(resourceId),
    );
  }

  /** Expire a Checkout Session (idempotent). */
  async expireCheckoutSession(
    sessionId: string,
    ctx: IdempotencyContext,
  ): Promise<Stripe.Checkout.Session> {
    return this.runIdempotent(ctx, (options) =>
      this.stripe.checkout.sessions.expire(sessionId, options),
      (resourceId) => this.stripe.checkout.sessions.retrieve(resourceId),
    );
  }

  // ── Read-only pass-throughs (no idempotency key) ─────────────────

  retrieveCheckoutSession(
    id: string,
    params?: Stripe.Checkout.SessionRetrieveParams,
  ): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(id, params);
  }

  listCheckoutSessions(
    params: Stripe.Checkout.SessionListParams,
  ): Promise<Stripe.ApiList<Stripe.Checkout.Session>> {
    return this.stripe.checkout.sessions.list(params);
  }

  /**
   * Shared idempotency wrapper:
   *  1. Generate a deterministic key from `ctx`.
   *  2. Reserve it (INSERT-first). If a COMPLETED record exists, replay it.
   *     If another request is in-flight, `reserve` throws 409.
   *  3. Execute the Stripe call; on success mark COMPLETED, on error FAILED.
   *
   * When the rollback switch is off, the Stripe call runs untouched (no key,
   * no bookkeeping) so a faulty key generator can never block payments.
   */
  private async runIdempotent<T extends { id: string }>(
    ctx: IdempotencyContext,
    execute: (options: Stripe.RequestOptions) => Promise<T>,
    replay: (resourceId: string) => Promise<T>,
  ): Promise<T> {
    if (!this.idempotencyEnabled) {
      return execute({});
    }

    const key = this.keyService.generate(ctx);
    const existing = await this.store.reserve(
      key,
      ctx.operation,
      ctx.entityId,
      ctx.fingerprint ? key : undefined,
    );

    if (existing?.status === 'COMPLETED' && existing.resourceId) {
      this.logger.log(`Replaying idempotent ${ctx.operation} for key ${key}`);
      return replay(existing.resourceId);
    }

    try {
      const result = await execute({ idempotencyKey: key });
      await this.store.complete(key, result.id);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.store.fail(key, message);
      throw err;
    }
  }
}
