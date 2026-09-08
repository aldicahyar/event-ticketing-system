import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { IdempotencyContext } from './interfaces/idempotency.interface';
import { IdempotencyKeyService } from './idempotency/idempotency-key.service';
import { IdempotencyStoreService } from './idempotency/idempotency-store.service';
import { IDEMPOTENCY_ENABLED_CONFIG_KEY } from './idempotency/idempotency.constants';

/**
 * Single source of truth for the Stripe API version. Override per environment
 * via STRIPE_API_VERSION; never hardcode the literal elsewhere (GAP-14).
 */
export const DEFAULT_STRIPE_API_VERSION = '2023-10-16';

/** Default per-request HTTP timeout in ms. `0` disables the limit. */
const DEFAULT_STRIPE_TIMEOUT_MS = 30_000;

/** Default automatic network retries performed by the Stripe SDK. `0` = off. */
const DEFAULT_STRIPE_MAX_NETWORK_RETRIES = 2;

/**
 * Central owner of the Stripe SDK client and the single place where write
 * operations are performed. Every write (create/refund/expire) automatically
 * receives a deterministic Idempotency-Key, so callers cannot forget it — this
 * closes the root cause of GAP-05.
 *
 * Read operations (retrieve/list) are exposed as curated pass-through methods;
 * they are naturally idempotent and do not take an idempotency key.
 *
 * This service is the sole instantiator of `new Stripe(...)` and the only
 * reader of Stripe-related configuration (secret key, API version, webhook
 * secret, timeout, retries). The SDK instance is fully encapsulated — feature
 * modules cannot bypass this service (completes GAP-14).
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  /** Rollback switch: when false, Stripe calls run without idempotency keys. */
  private readonly idempotencyEnabled: boolean;
  /** Shared secret used to verify incoming webhook signatures. */
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly keyService: IdempotencyKeyService,
    private readonly store: IdempotencyStoreService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required to initialise the Stripe client');
    }
    const apiVersion = (this.configService.get<string>('STRIPE_API_VERSION') ??
      DEFAULT_STRIPE_API_VERSION) as Stripe.LatestApiVersion;
    this.stripe = new Stripe(secretKey, {
      apiVersion,
      timeout: this.parseNonNegativeInt('STRIPE_TIMEOUT_MS', DEFAULT_STRIPE_TIMEOUT_MS),
      maxNetworkRetries: this.parseNonNegativeInt(
        'STRIPE_MAX_NETWORK_RETRIES',
        DEFAULT_STRIPE_MAX_NETWORK_RETRIES,
      ),
    });
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    if (!this.webhookSecret) {
      this.logger.warn(
        'STRIPE_WEBHOOK_SECRET is not set — webhook signature verification will fail until it is configured',
      );
    }
    this.idempotencyEnabled =
      this.configService.get<string>(IDEMPOTENCY_ENABLED_CONFIG_KEY) !== 'false';
    if (!this.idempotencyEnabled) {
      this.logger.warn(
        'Idempotency is DISABLED via IDEMPOTENCY_ENABLED=false — Stripe writes run without keys',
      );
    }
  }

  /**
   * Verify a raw webhook request against the configured STRIPE_WEBHOOK_SECRET.
   * Throws when the secret is missing or the signature does not match — the
   * caller (WebhookProcessorService) relies on the throw to make Stripe retry.
   */
  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }
    return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }

  /** Retrieve a PaymentIntent (read-only), e.g. for the admin ops snapshot. */
  retrievePaymentIntent(
    id: string,
    params?: Stripe.PaymentIntentRetrieveParams,
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(id, params);
  }

  /** List balance transactions (read-only), e.g. for revenue reconciliation. */
  listBalanceTransactions(
    params: Stripe.BalanceTransactionListParams,
  ): Promise<Stripe.ApiList<Stripe.BalanceTransaction>> {
    return this.stripe.balanceTransactions.list(params);
  }

  /**
   * Parse a non-negative integer config value, falling back when unset or
   * malformed. Keeps client options env-driven with safe defaults (GAP-14).
   */
  private parseNonNegativeInt(configKey: string, fallback: number): number {
    const raw = this.configService.get<string>(configKey);
    if (raw === undefined || raw === '') {
      return fallback;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      this.logger.warn(`Invalid ${configKey}="${raw}" — falling back to ${fallback}`);
      return fallback;
    }
    return Math.floor(parsed);
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
    return this.runIdempotent(
      ctx,
      (options) => this.stripe.checkout.sessions.create(params, options),
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
    return this.runIdempotent(
      ctx,
      (options) => this.stripe.refunds.create(params, options),
      (resourceId) => this.stripe.refunds.retrieve(resourceId),
    );
  }

  /** Expire a Checkout Session (idempotent). */
  async expireCheckoutSession(
    sessionId: string,
    ctx: IdempotencyContext,
  ): Promise<Stripe.Checkout.Session> {
    return this.runIdempotent(
      ctx,
      (options) => this.stripe.checkout.sessions.expire(sessionId, options),
      (resourceId) => this.stripe.checkout.sessions.retrieve(resourceId),
    );
  }

  // ── Read-only pass-throughs (no idempotency key) ─────────────────

  /** Retrieve a Stripe Customer by ID. Read-only, no idempotency needed. */
  retrieveCustomer(id: string): Promise<Stripe.Customer> {
    return this.stripe.customers.retrieve(id) as Promise<Stripe.Customer>;
  }

  /** Create a Stripe Billing Portal session for a customer (self-service). */
  createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

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

  retrieveDispute(id: string): Promise<Stripe.Dispute> {
    return this.stripe.disputes.retrieve(id);
  }

  updateDispute(
    id: string,
    params: Stripe.DisputeUpdateParams,
    ctx: IdempotencyContext,
  ): Promise<Stripe.Dispute> {
    return this.runIdempotent(
      ctx,
      (options) => this.stripe.disputes.update(id, params, options),
      () => this.stripe.disputes.retrieve(id),
    );
  }

  closeDispute(id: string, ctx: IdempotencyContext): Promise<Stripe.Dispute> {
    return this.runIdempotent(
      ctx,
      (options) => this.stripe.disputes.close(id, {}, options),
      () => this.stripe.disputes.retrieve(id),
    );
  }

  uploadDisputeEvidence(
    params: Stripe.FileCreateParams,
    ctx: IdempotencyContext,
  ): Promise<Stripe.File> {
    return this.runIdempotent(
      ctx,
      (options) => this.stripe.files.create(params, options),
      (resourceId) => this.stripe.files.retrieve(resourceId),
    );
  }

  /**
   * Create a Stripe Customer with an idempotency key derived from `ctx`.
   * Retried identical requests replay the existing customer instead of
   * creating a duplicate (GAP-10, Fase 12).
   */
  async createCustomer(
    params: Stripe.CustomerCreateParams,
    ctx: IdempotencyContext,
  ): Promise<Stripe.Customer> {
    return this.runIdempotent(
      ctx,
      (options) => this.stripe.customers.create(params, options),
      (resourceId) => this.stripe.customers.retrieve(resourceId) as Promise<Stripe.Customer>,
    );
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
