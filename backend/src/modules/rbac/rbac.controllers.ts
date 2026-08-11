import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  CreateMenuDto,
  UpdateMenuDto,
  ReplacePermissionsDto,
  AssignRoleDto,
} from './dto/rbac.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sidebar')
@Controller('menus')
export class SidebarController {
  constructor(private readonly rbac: RbacService) {}

  @Get('my-sidebar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get sidebar menus for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flat list of visible menus with permissions',
  })
  async getMySidebar(@CurrentUser() user: any) {
    const data = await this.rbac.getMySidebar(user.role_code);
    return { data, message: 'Sidebar menus retrieved successfully' };
  }
}

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rbac: RbacService) {}

  @Get()
  @RequirePermission('RBAC_ROLES')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all roles' })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'includePermissions', required: false, type: Boolean })
  async listRoles(
    @Query('is_active') is_active?: string,
    @Query('includePermissions') includePermissions?: string,
  ) {
    const data = await this.rbac.listRoles({
      is_active: is_active === undefined ? undefined : is_active === 'true',
      includePermissions: includePermissions === 'true',
    });
    return { data, message: 'Roles retrieved successfully' };
  }

  @Post()
  @RequirePermission('RBAC_ROLES', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new role' })
  async createRole(@Body() dto: CreateRoleDto, @CurrentUser() user: any) {
    const data = await this.rbac.createRole(dto, user.id);
    return { data, message: 'Role created successfully' };
  }

  @Patch(':code')
  @RequirePermission('RBAC_ROLES', 'edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a role' })
  async updateRole(
    @Param('code') code: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.rbac.updateRole(code, dto, user.id);
    return { data, message: 'Role updated successfully' };
  }

  @Delete(':code')
  @RequirePermission('RBAC_ROLES', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a role' })
  async deleteRole(@Param('code') code: string, @CurrentUser() user: any) {
    const data = await this.rbac.deleteRole(code, user.id);
    return { data, message: 'Role deactivated successfully' };
  }
}

@ApiTags('Menus')
@Controller('menus/admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MenusAdminController {
  constructor(private readonly rbac: RbacService) {}

  @Get()
  @RequirePermission('RBAC_MENUS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all menus' })
  async listMenus(@Query('is_active') is_active?: string) {
    const data = await this.rbac.listMenus({
      is_active: is_active === undefined ? undefined : is_active === 'true',
    });
    return { data, message: 'Menus retrieved successfully' };
  }

  @Post()
  @RequirePermission('RBAC_MENUS', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a menu' })
  async createMenu(@Body() dto: CreateMenuDto, @CurrentUser() user: any) {
    const data = await this.rbac.createMenu(dto, user.id);
    return { data, message: 'Menu created successfully' };
  }

  @Patch(':code')
  @RequirePermission('RBAC_MENUS', 'edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a menu' })
  async updateMenu(
    @Param('code') code: string,
    @Body() dto: UpdateMenuDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.rbac.updateMenu(code, dto, user.id);
    return { data, message: 'Menu updated successfully' };
  }

  @Delete(':code')
  @RequirePermission('RBAC_MENUS', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a menu (cascade to children)' })
  async deleteMenu(@Param('code') code: string, @CurrentUser() user: any) {
    const data = await this.rbac.deleteMenu(code, user.id);
    return { data, message: 'Menu deactivated successfully' };
  }
}

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly rbac: RbacService) {}

  @Get()
  @RequirePermission('RBAC_PERMISSIONS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get permission matrix' })
  async getMatrix(@Query('role_code') role_code?: string, @Query('menu_code') menu_code?: string) {
    const data = await this.rbac.getPermissionMatrix({ role_code, menu_code });
    return { data, message: 'Permission matrix retrieved successfully' };
  }

  @Get(':role_code')
  @RequirePermission('RBAC_PERMISSIONS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get permissions for a single role' })
  async getRolePermissions(@Param('role_code') role_code: string) {
    const data = await this.rbac.getRolePermissions(role_code);
    return { data, message: 'Role permissions retrieved successfully' };
  }

  @Put(':role_code')
  @RequirePermission('RBAC_PERMISSIONS', 'edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace permission matrix for a role (atomic)' })
  async replacePermissions(
    @Param('role_code') role_code: string,
    @Body() dto: ReplacePermissionsDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.rbac.replaceRolePermissions(role_code, dto, user.id);
    return { data, message: 'Permissions updated successfully' };
  }
}

@ApiTags('User Roles')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UserRolesController {
  constructor(private readonly rbac: RbacService) {}

  @Get(':id/role')
  @RequirePermission('RBAC_ROLES')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get user's current role" })
  async getUserRole(@Param('id') id: string) {
    const data = await this.rbac.getUserRole(id);
    return { data, message: 'User role retrieved successfully' };
  }

  @Patch(':id/role')
  @RequirePermission('RBAC_ROLES', 'edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign role to user' })
  async assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto, @CurrentUser() user: any) {
    const data = await this.rbac.assignUserRole(id, dto.role_code, user.id);
    return { data, message: 'Role assigned successfully' };
  }
}
