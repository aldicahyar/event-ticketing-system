import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { BookingsService } from './bookings.service';
import { InvoiceService } from './invoice.service';
import { CheckoutDto, CancelBookingDto } from './dto/bookings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

type AuthenticatedUser = {
  id: string;
  role: string;
  email: string;
};

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Get(':id/invoice')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Download invoice PDF for a booking' })
  async getInvoice(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() reply: FastifyReply,
  ) {
    const { filename, pdf } = await this.invoiceService.generateInvoice(id, user);
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(pdf);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Checkout and lock seats for booking' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Seats locked and checkout initiated' })
  async checkout(@Body() dto: CheckoutDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.bookingsService.checkout(user.id, dto.event_id, dto.seatIds, {
      guest_name: dto.guest_name,
      guest_email: dto.guest_email,
      guest_phone: dto.guest_phone,
    });
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: data.message,
    };
  }

  @Post('check-in/:qrCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in a valid ticket' })
  async checkIn(@Param('qrCode') qrCode: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.checkInTicket(qrCode, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending booking' })
  async cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.bookingsService.cancelBooking(id, user, dto.reason, dto.description);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: 'Booking cancelled successfully. Seats have been released.',
    };
  }

  @Get('my-orders')
  @HttpCode(HttpStatus.OK)
  async findMyOrders(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.bookingsService.findMyOrders(user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: 'Orders retrieved successfully',
    };
  }

  @Get('my-orders/:id')
  @HttpCode(HttpStatus.OK)
  async findMyOrderById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.bookingsService.findMyOrderById(user.id, id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: 'Order retrieved successfully',
    };
  }

  @Get('my-tickets')
  @HttpCode(HttpStatus.OK)
  async findMyTickets(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.bookingsService.findMyTickets(user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: 'Tickets retrieved successfully',
    };
  }

  @Get('my-stats')
  @HttpCode(HttpStatus.OK)
  async getMyStats(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.bookingsService.getMyOrderStats(user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: 'Stats retrieved successfully',
    };
  }
}
