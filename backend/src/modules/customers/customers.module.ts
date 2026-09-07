import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

/**
 * Stripe Customer management (Fase 12 / M3).
 *
 * No imports needed: PrismaService comes from the global DatabaseModule and
 * StripeService from the global StripeModule. CustomersService is exported so
 * PaymentsModule (and future checkout flows) can reuse ensureCustomer().
 */
@Module({
  imports: [],
  providers: [CustomersService],
  controllers: [CustomersController],
  exports: [CustomersService],
})
export class CustomersModule {}
