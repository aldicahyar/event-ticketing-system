import { Global, Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { IdempotencyKeyService } from './idempotency/idempotency-key.service';
import { IdempotencyStoreService } from './idempotency/idempotency-store.service';

/**
 * Provides the unified Stripe client with built-in idempotency handling.
 * Global so any feature module can inject {@link StripeService} without
 * re-importing. Relies on the global DatabaseModule for PrismaService.
 */
@Global()
@Module({
  providers: [StripeService, IdempotencyKeyService, IdempotencyStoreService],
  exports: [StripeService],
})
export class StripeModule {}
