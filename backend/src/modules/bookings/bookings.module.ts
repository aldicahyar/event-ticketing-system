import { Module, forwardRef } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { InvoiceService } from './invoice.service';
import { TaxResolverService } from './tax-resolver.service';
import { BookingCodeService } from './booking-code.service';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => PaymentsModule), NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService, InvoiceService, TaxResolverService, BookingCodeService],
  exports: [BookingsService, TaxResolverService, BookingCodeService, InvoiceService],
})
export class BookingsModule {}

