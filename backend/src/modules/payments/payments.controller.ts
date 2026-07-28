import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  RawBodyRequest,
  Body,
  UseGuards,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe/webhook')
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    try {
      return await this.paymentsService.handleWebhook(req, signature);
    } catch (err: any) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }

  @Post('verify-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Verify a Stripe checkout session by ID and sync the booking status (fallback for missed webhooks)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session verified and booking synced if needed' })
  async verifySession(
    @Body() body: { session_id: string },
    @CurrentUser() user: any,
  ) {
    const data = await this.paymentsService.verifyAndSyncStripeSession(
      body.session_id,
      user.id,
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: 'Session verification complete',
    };
  }

  @Post('recover-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Recover an unfinished checkout: inspect the Stripe session linked to a booking and return its status + a fresh checkout URL when applicable.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Returns one of: confirmed | expired | pending | new_session with a checkout_url when the user can still pay.',
  })
  async recoverSession(
    @Body() body: { booking_id: string },
    @CurrentUser() user: any,
  ) {
    const data = await this.paymentsService.recoverSession(
      body.booking_id,
      user.id,
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: data.message,
    };
  }

  @Get('pending-sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'List the current user\'s unfinished but resumable Stripe checkout sessions (powers the "Continue Payment" buttons on the dashboard & order history).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Array of resumable sessions, each with a server-validated checkout_url. Already-paid sessions are synced to CONFIRMED and excluded.',
  })
  async getPendingSessions(@CurrentUser() user: any) {
    const data = await this.paymentsService.getResumableSessions(user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message:
        data.length > 0
          ? 'You have unfinished checkout sessions.'
          : 'No pending checkout sessions.',
    };
  }
}
