import { Module } from '@nestjs/common';
import { RbacModule } from '../rbac/rbac.module';
import { RefundsModule } from '../refunds/refunds.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  // RbacModule provides RbacService for PermissionsGuard; RefundsModule gives
  // the refund state machine used by admin-initiated refunds.
  imports: [RbacModule, RefundsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
