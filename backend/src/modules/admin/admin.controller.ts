import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AdminService } from './admin.service';
import { AdminRefundDto, QueryActivityDto, QueryAdminPaymentDto } from './dto/admin.dto';

interface Actor {
  id: string;
  role?: string;
  role_code?: string;
}

@ApiTags('admin-ops')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('payments')
  @RequirePermission('DASHBOARD_OPS', 'view')
  @ApiOperation({ summary: 'List all payments with filters (ops console)' })
  listPayments(@Query() query: QueryAdminPaymentDto) {
    return this.service.listPayments(query);
  }

  @Get('payments/:id')
  @RequirePermission('DASHBOARD_OPS', 'view')
  @ApiOperation({ summary: 'Payment detail: DB record + live Stripe PaymentIntent' })
  paymentDetail(@Param('id') id: string) {
    return this.service.paymentDetail(id);
  }

  @Post('payments/:id/refund')
  @RequirePermission('DASHBOARD_OPS', 'edit')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Admin-initiated refund via the refund state machine' })
  refund(@Param('id') id: string, @Body() dto: AdminRefundDto, @CurrentUser() user: Actor) {
    return this.service.refundPayment(
      id,
      { id: user.id, role: user.role_code ?? user.role ?? 'ADMIN' },
      dto.note,
    );
  }

  @Get('activity')
  @RequirePermission('DASHBOARD_ACTIVITY', 'view')
  @ApiOperation({ summary: 'Cross-domain activity feed (default last 30 days)' })
  activity(@Query() query: QueryActivityDto) {
    return this.service.activity(query);
  }
}
