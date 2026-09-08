import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import { StripeService } from '../../common/stripe/stripe.service';
import Stripe from 'stripe';

/**
 * Thin service owning the user↔Stripe Customer relationship. All write ops are
 * delegated to {@link StripeService} so the idempotency infrastructure is shared.
 *
 * ponytail: no caching — Stripe and Prisma are the source of truth.
 */
@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Returns the Stripe Customer for the given user, creating one lazily if
   * the user record has no stripe_customer_id yet. Safe to call multiple times
   * — idempotency keys ensure only one Stripe Customer is created per user.
   */
  async ensureCustomer(userId: string): Promise<Stripe.Customer> {
    const user = await this.prisma.t_mtr_users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, stripe_customer_id: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    let staleCustomerId: string | null = null;

    if (user.stripe_customer_id) {
      const existing = await this.retrieveLiveCustomer(user.stripe_customer_id);
      if (existing) {
        return existing;
      }
      staleCustomerId = user.stripe_customer_id;
      await this.clearStaleCustomerId(userId, staleCustomerId);
    }

    const customer = await this.stripeService.createCustomer(
      { email: user.email, name: user.name, metadata: { userId, platform: 'event-ticketing' } },
      {
        operation: 'customer_create',
        entityId: userId,
        // A recreation after a stale/deleted link must use a different key,
        // otherwise the idempotency store replays the deleted customer.
        discriminator: staleCustomerId ? `recreate${staleCustomerId}` : '1',
        fingerprint: { userId },
      },
    );

    await this.linkCustomerIdWithRetry(userId, customer.id);

    this.logger.log(`Created Stripe Customer ${customer.id} for user ${userId}`);
    return customer;
  }

  /**
   * Returns the linked customer when it is still live in Stripe, or null when
   * it was deleted. Covers both failure modes: a `resource_missing` error
   * (purged id) and the soft-delete response (`deleted: true`, HTTP 200).
   */
  private async retrieveLiveCustomer(customerId: string): Promise<Stripe.Customer | null> {
    let customer: Stripe.Customer;
    try {
      customer = await this.stripeService.retrieveCustomer(customerId);
    } catch (err) {
      if (!this.isResourceMissing(err)) throw err;
      return null;
    }
    return (customer as unknown as { deleted?: boolean }).deleted ? null : customer;
  }

  /** Unsets a stale stripe_customer_id so the next creation is not blocked. */
  private async clearStaleCustomerId(userId: string, customerId: string): Promise<void> {
    this.logger.warn(
      `Stripe Customer ${customerId} no longer exists for user ${userId} — resetting the stale link and creating a new customer`,
    );
    await this.prisma.t_mtr_users.update({
      where: { id: userId },
      data: { stripe_customer_id: null },
    });
  }

  /** Duck-typed Stripe error check: resource_missing = id unknown to Stripe. */
  private isResourceMissing(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      (err as { code?: unknown }).code === 'resource_missing'
    );
  }

  /**
   * Persists the Stripe Customer id with bounded retries.
   * Deliberately does NOT delete the Stripe Customer on failure: the
   * idempotency store already marked the key COMPLETED, so deleting would
   * break replay ("No such customer"). A later call replays the same
   * customer and re-runs this link.
   */
  private async linkCustomerIdWithRetry(userId: string, customerId: string): Promise<void> {
    const maxAttempts = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.prisma.t_mtr_users.update({
          where: { id: userId },
          data: { stripe_customer_id: customerId },
        });
        return;
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 100));
        }
      }
    }
    this.logger.error(
      `Failed to link Stripe Customer ${customerId} to user ${userId} after ${maxAttempts} attempts — the idempotency store will replay this customer on the next call`,
      lastError instanceof Error ? lastError.stack : String(lastError),
    );
    throw lastError;
  }

  /**
   * Returns safe (owner-only) customer info without creating a Stripe Customer.
   * stripeCustomerId is null when the user has never been charged yet.
   */
  async getCustomerInfo(userId: string) {
    const user = await this.prisma.t_mtr_users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, stripe_customer_id: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      stripeCustomerId: user.stripe_customer_id ?? null,
    } as const;
  }

  /**
   * Opens the Stripe Billing Portal for the authenticated user. Creates the
   * Stripe Customer lazily if it does not exist yet.
   *
   * Rejects open redirects: the returnUrl origin must match the FRONTEND_URL
   * or localhost in development.
   */
  async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    this.assertAllowedReturnUrl(returnUrl);
    const customer = await this.ensureCustomer(userId);
    const session = await this.stripeService.createBillingPortalSession(customer.id, returnUrl);
    return session.url;
  }

  private assertAllowedReturnUrl(returnUrl: string): void {
    let parsed: URL;
    try {
      parsed = new URL(returnUrl);
    } catch {
      throw new BadRequestException('Invalid returnUrl format');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    let allowedOrigins: string[];
    try {
      allowedOrigins = [new URL(frontendUrl).origin];
    } catch {
      allowedOrigins = ['http://localhost:3001'];
    }

    // Include localhost origins in non-production for local dev/e2e convenience.
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    if (!isProd) {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
      );
    }

    if (!allowedOrigins.includes(parsed.origin)) {
      throw new BadRequestException(
        `returnUrl origin ${parsed.origin} is not allowed (must match frontend origin)`,
      );
    }
  }
}
