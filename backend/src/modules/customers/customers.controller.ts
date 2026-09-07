import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomersService } from './customers.service';
import { CustomerInfoDto } from './dto/customer.dto';
import { CreatePortalSessionDto, PortalSessionDto } from './dto/portal.dto';

type AuthenticatedUser = {
  id: string;
  role: string;
  email: string;
};

/**
 * Self-service Stripe Customer endpoints (Fase 12 / M3).
 * Everything here is owner-scoped: the userId always comes from the JWT.
 */
@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly configService: ConfigService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user Stripe customer info (never creates one)' })
  async getCustomerInfo(@CurrentUser() user: AuthenticatedUser): Promise<CustomerInfoDto> {
    return this.customersService.getCustomerInfo(user.id);
  }

  @Post('portal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Open the Stripe Billing Portal for the current user' })
  async createPortalSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePortalSessionDto,
  ): Promise<PortalSessionDto> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    const url = await this.customersService.createPortalSession(
      user.id,
      dto.returnUrl ?? frontendUrl,
    );
    return { url };
  }
}
