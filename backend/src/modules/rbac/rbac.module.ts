import { Module, Global } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from './rbac.service';
import {
  SidebarController,
  RolesController,
  MenusAdminController,
  PermissionsController,
  UserRolesController,
} from './rbac.controllers';

@Global()
@Module({
  controllers: [
    SidebarController,
    RolesController,
    MenusAdminController,
    PermissionsController,
    UserRolesController,
  ],
  providers: [RbacService, Reflector],
  exports: [RbacService, Reflector],
})
export class RbacModule {}
