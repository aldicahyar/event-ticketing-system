import { Module } from '@nestjs/common';
import { StripeModule } from '../../common/stripe/stripe.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RbacModule } from '../rbac/rbac.module';
import { DisputesController } from './disputes.controller';
import { DisputesRepository } from './disputes.repository';
import { DisputesService } from './disputes.service';

@Module({
  // RbacModule provides RbacService, which PermissionsGuard depends on.
  imports: [StripeModule, NotificationsModule, RbacModule],
  controllers: [DisputesController],
  providers: [DisputesRepository, DisputesService],
  exports: [DisputesRepository, DisputesService],
})
export class DisputesModule {}
