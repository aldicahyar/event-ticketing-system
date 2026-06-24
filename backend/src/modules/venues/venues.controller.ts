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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { IdDto } from './dto/id.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../auth/dto/auth.dto';

@ApiTags('venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all venues' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return all venues' })
  async findAll() {
    const list = await this.venuesService.findAll();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: list,
      message: 'Venues retrieved successfully',
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a venue by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return venue details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Venue not found' })
  async findOne(@Param('id') id: string) {
    const item = await this.venuesService.findOne(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: item,
      message: 'Venue retrieved successfully',
    };
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new venue (Admin/Organizer only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Venue successfully created' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource' })
  async create(@Body() dto: CreateVenueDto) {
    const item = await this.venuesService.create(dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      data: item,
      message: 'Venue created successfully',
    };
  }

  @Post('update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a venue (Admin/Organizer only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Venue successfully updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Venue not found' })
  async update(@Body() dto: UpdateVenueDto) {
    const item = await this.venuesService.update(dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: item,
      message: 'Venue updated successfully',
    };
  }

  @Post('delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a venue (Admin/Organizer only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Venue successfully deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Venue not found' })
  async remove(@Body() dto: IdDto) {
    const result = await this.venuesService.remove(dto.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: result,
      message: 'Venue deleted successfully',
    };
  }
}
