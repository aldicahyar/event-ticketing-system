import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CheckoutDto, CancelBookingDto } from './dto/bookings.dto';
import { Post, Body } from '@nestjs/common';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Checkout and lock seats for booking' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Seats locked and checkout initiated' })
  async checkout(
    @Body() dto: CheckoutDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.bookingsService.checkout(
      user.id, 
      dto.event_id, 
      dto.seatIds,
      {
        guest_name: dto.guest_name,
        guest_email: dto.guest_email,
        guest_phone: dto.guest_phone,
      }
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: data.message,
    };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a PENDING booking (releases seats + expires Stripe session)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking cancelled successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to cancel this booking' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Booking is not in a cancellable state' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Booking was modified by another process' })
  async cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.bookingsService.cancelBooking(
      id,
      { id: user.id, role: user.role, email: user.email },
      dto.reason,
      dto.description,
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: 'Booking cancelled successfully. Seats have been released.',
    };
  }

  @Get('my-orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get orders for the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return current user orders' })
  async findMyOrders(@CurrentUser() user: any) {
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
  @ApiOperation({ summary: 'Get a single order for the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return order details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Order not found' })
  async findMyOrderById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
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
  @ApiOperation({ summary: 'Get tickets for the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return current user tickets' })
  async findMyTickets(@CurrentUser() user: any) {
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
  @ApiOperation({ summary: 'Get aggregate order stats for the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return current user order stats' })
  async getMyStats(@CurrentUser() user: any) {
    const data = await this.bookingsService.getMyOrderStats(user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: 'Stats retrieved successfully',
    };
  }
}
