import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  ListUsersQueryDto,
  CreateUserDto,
  UpdateUserDto,
  AdminResetPasswordDto,
} from './dto/user-admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Admin user monitoring + management.
 *
 * Mounted under `/users/manage` so it never shadows the role-assignment routes
 * already registered on `/users/:id/role` by RbacModule's UserRolesController.
 *
 * Every route is gated by the `USERS` menu in the RBAC permission matrix.
 */
@ApiTags('User Management')
@Controller('users/manage')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('stats')
  @RequirePermission('USERS', 'view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aggregate user counters for monitoring cards' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Counts by status and role' })
  async stats() {
    const data = await this.users.getStats();
    return { data, message: 'User statistics retrieved successfully' };
  }

  @Get()
  @RequirePermission('USERS', 'view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List users (search, filter, paginate)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated user list' })
  async list(@Query() query: ListUsersQueryDto) {
    const data = await this.users.listUsers(query);
    return { data, message: 'Users retrieved successfully' };
  }

  @Get(':id')
  @RequirePermission('USERS', 'view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single user' })
  async detail(@Param('id') id: string) {
    const data = await this.users.getUser(id);
    return { data, message: 'User retrieved successfully' };
  }

  @Post()
  @RequirePermission('USERS', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a user' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already registered' })
  async create(@Body() dto: CreateUserDto) {
    const data = await this.users.createUser(dto);
    return { data, message: 'User created successfully' };
  }

  @Patch(':id')
  @RequirePermission('USERS', 'edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a user (name, email, role, active, verified)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: any,
  ) {
    const data = await this.users.updateUser(id, dto, actor.id);
    return { data, message: 'User updated successfully' };
  }

  @Post(':id/unlock')
  @RequirePermission('USERS', 'edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear a failed-login lockout' })
  async unlock(@Param('id') id: string, @CurrentUser() actor: any) {
    const data = await this.users.unlockUser(id, actor.id);
    return { data, message: 'User unlocked successfully' };
  }

  @Post(':id/reset-password')
  @RequirePermission('USERS', 'edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force a new password and revoke all sessions' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
    @CurrentUser() actor: any,
  ) {
    const data = await this.users.resetPassword(id, dto.newPassword, actor.id);
    return { data, message: 'Password reset successfully' };
  }

  @Delete(':id')
  @RequirePermission('USERS', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user (blocked when bookings exist)' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'User still has bookings' })
  async remove(@Param('id') id: string, @CurrentUser() actor: any) {
    const data = await this.users.deleteUser(id, actor.id);
    return { data, message: 'User deleted successfully' };
  }
}
