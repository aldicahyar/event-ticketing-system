import { Module, forwardRef } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { InvoiceService } from './invoice.service';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => PaymentsModule), NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService, InvoiceService],
  exports: [BookingsService],
})
export class BookingsModule {}
