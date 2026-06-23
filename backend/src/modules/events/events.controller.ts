import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { IdDto } from '../venues/dto/id.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../auth/dto/auth.dto';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all events' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return all events' })
  async findAll() {
    const list = await this.eventsService.findAll();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: list,
      message: 'Events retrieved successfully',
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an event by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return event details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  async findOne(@Param('id') id: string) {
    const item = await this.eventsService.findOne(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: item,
      message: 'Event retrieved successfully',
    };
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new event (Admin/Organizer only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Event successfully created' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource' })
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: any) {
    const item = await this.eventsService.create(dto, user.id);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      data: item,
      message: 'Event created successfully',
    };
  }

  @Post('update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an event (Admin/Organizer only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Event successfully updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  async update(@Body() dto: UpdateEventDto) {
    const item = await this.eventsService.update(dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: item,
      message: 'Event updated successfully',
    };
  }

  @Post('delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an event (Admin/Organizer only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Event successfully deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  async remove(@Body() dto: IdDto) {
    const result = await this.eventsService.remove(dto.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: result,
      message: 'Event deleted successfully',
    };
  }
}
