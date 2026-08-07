import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRefundDto } from './dto/create-refund.dto';
import { QueryRefundDto } from './dto/query-refund.dto';
import { RejectRefundDto } from './dto/reject-refund.dto';
import { UpdateRefundPolicyDto } from './dto/update-policy.dto';
import { RefundsService } from './refunds.service';

interface CurrentActor {
  id: string;
  role?: string;
  role_code?: string;
}

@ApiTags('refunds')
@ApiBearerAuth()
@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Request a refund for a confirmed booking' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateRefundDto) {
    return this.refundsService.create(userId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List current user refund requests' })
  findMine(@CurrentUser('id') userId: string) {
    return this.refundsService.findMine(userId);
  }

  @Get('policies')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List configurable refund policy percentages (admin)' })
  listPolicies() {
    return this.refundsService.listPolicies();
  }

  @Get('policies/audit')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List refund policy change audit log (admin)' })
  listPolicyAudit() {
    return this.refundsService.listPolicyAudit();
  }

  @Patch('policies/:ruleCode')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a refund policy percentage or active flag (admin)' })
  updatePolicy(
    @Param('ruleCode') ruleCode: string,
    @Body() dto: UpdateRefundPolicyDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.refundsService.updatePolicy(ruleCode, dto, adminId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'List refund requests (admin/organizer)' })
  findAll(@CurrentUser() user: CurrentActor, @Query() query: QueryRefundDto) {
    return this.refundsService.findAll(this.actor(user), query.status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get refund request detail' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentActor) {
    return this.refundsService.findOne(id, this.actor(user));
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Approve and execute a refund via Stripe' })
  approve(@Param('id') id: string, @CurrentUser() user: CurrentActor) {
    return this.refundsService.approve(id, this.actor(user));
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Reject a refund request' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectRefundDto,
    @CurrentUser() user: CurrentActor,
  ) {
    return this.refundsService.reject(id, this.actor(user), dto.note);
  }

  @Patch(':id/retry')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Retry a failed Stripe refund' })
  retry(@Param('id') id: string, @CurrentUser() user: CurrentActor) {
    return this.refundsService.retry(id, this.actor(user));
  }

  private actor(user: CurrentActor) {
    return { id: user.id, role: user.role_code ?? user.role ?? 'ATTENDEE' };
  }
}
