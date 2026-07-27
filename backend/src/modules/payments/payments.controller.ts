import { Controller, Post, Req, Headers, BadRequestException, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';

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
}
