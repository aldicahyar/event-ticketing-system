import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import {
  SidebarController,
  RolesController,
  MenusAdminController,
  PermissionsController,
  UserRolesController,
} from './rbac.controllers';

@Module({
  controllers: [
    SidebarController,
    RolesController,
    MenusAdminController,
    PermissionsController,
    UserRolesController,
  ],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
