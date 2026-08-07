import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RefundPolicyService } from './refund-policy.service';
import { RefundsController } from './refunds.controller';
import { RefundsRepository } from './refunds.repository';
import { RefundsService } from './refunds.service';

@Module({
  imports: [PaymentsModule, NotificationsModule],
  controllers: [RefundsController],
  providers: [RefundsRepository, RefundPolicyService, RefundsService],
  exports: [RefundsRepository, RefundPolicyService, RefundsService],
})
export class RefundsModule {}
