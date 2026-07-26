import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  // RbacModule provides RbacService, which PermissionsGuard depends on.
  imports: [RbacModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
