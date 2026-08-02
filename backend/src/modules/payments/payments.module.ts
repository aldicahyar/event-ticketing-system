import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { BookingsModule } from '../bookings/bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DatabaseModule } from '../../common/database/database.module';

// Webhook infrastructure
import { WebhookProcessorService } from './webhook/webhook-processor.service';
import { WebhookEventLogService } from './webhook/webhook-event-log.service';
import { PaymentAuditService } from './audit/payment-audit.service';
import { StripeService } from '../../common/stripe/stripe.service';

// Webhook event handlers
import { CheckoutCompletedHandler } from './webhook/handlers/checkout-completed.handler';
import { CheckoutExpiredHandler } from './webhook/handlers/checkout-expired.handler';
import { PaymentFailedHandler } from './webhook/handlers/payment-failed.handler';
import { ChargeRefundedHandler } from './webhook/handlers/charge-refunded.handler';
import { RefundUpdatedHandler } from './webhook/handlers/refund-updated.handler';
import { DisputeCreatedHandler } from './webhook/handlers/dispute-created.handler';
import { DisputeClosedHandler } from './webhook/handlers/dispute-closed.handler';
import { AsyncPaymentSucceededHandler } from './webhook/handlers/async-payment-succeeded.handler';
import { AsyncPaymentFailedHandler } from './webhook/handlers/async-payment-failed.handler';
import { ConfigService } from '@nestjs/config';

// Token for injecting all webhook handlers as an array
export const WEBHOOK_HANDLERS = 'WEBHOOK_HANDLERS';

@Module({
  imports: [forwardRef(() => BookingsModule), NotificationsModule, DatabaseModule],
  controllers: [PaymentsController],
  providers: [
    // Core payment service
    PaymentsService,

    // Webhook infrastructure
    WebhookEventLogService,
    PaymentAuditService,

    // Webhook event handlers (each registered individually so they can
    // be injected into the handler array token below)
    CheckoutCompletedHandler,
    CheckoutExpiredHandler,
    PaymentFailedHandler,
    ChargeRefundedHandler,
    RefundUpdatedHandler,
    DisputeCreatedHandler,
    DisputeClosedHandler,
    AsyncPaymentSucceededHandler,
    AsyncPaymentFailedHandler,

    // Handler registry: injects all handlers as IWebhookEventHandler[]
    // so the WebhookProcessorService receives them via DI.
    {
      provide: WEBHOOK_HANDLERS,
      useFactory: (...handlers) => handlers,
      inject: [
        CheckoutCompletedHandler,
        CheckoutExpiredHandler,
        PaymentFailedHandler,
        ChargeRefundedHandler,
        RefundUpdatedHandler,
        DisputeCreatedHandler,
        DisputeClosedHandler,
        AsyncPaymentSucceededHandler,
        AsyncPaymentFailedHandler,
      ],
    },

    // Central webhook processor — depends on ConfigService,
    // WebhookEventLogService, and the handler array.
    {
      provide: WebhookProcessorService,
      inject: [
        ConfigService,
        WebhookEventLogService,
        StripeService,
        WEBHOOK_HANDLERS,
      ],
      useFactory: (configService, eventLogService, stripeService, handlers) =>
        new WebhookProcessorService(
          configService,
          eventLogService,
          stripeService,
          handlers,
        ),
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
