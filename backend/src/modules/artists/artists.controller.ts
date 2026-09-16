import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ArtistsService } from './artists.service';
import { CreateArtistDto, UpdateArtistDto, ListArtistsQueryDto } from './dto/artist.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Artists')
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artists: ArtistsService) {}

  /** Public: active artists with upcoming event counts, for the public lineup. */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active artists with upcoming event counts (public)' })
  async listForLineup() {
    const data = await this.artists.listForLineup();
    return { data, message: 'Artists retrieved successfully' };
  }

  /** Public: artist detail by code. */
  @Get('by-code/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an artist by code (public)' })
  async getByCode(@Param('code') code: string) {
    const data = await this.artists.getByCode(code);
    return { data, message: 'Artist retrieved successfully' };
  }

  /** Public: upcoming events featuring this artist. */
  @Get('by-code/:code/events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List upcoming events for an artist (public)' })
  async listEvents(@Param('code') code: string) {
    const data = await this.artists.listEvents(code);
    return { data, message: 'Artist events retrieved successfully' };
  }

  /** Must be declared before :id so 'admin' is not captured as a param. */
  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('ARTISTS', 'view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all artists with search/status filter (admin)' })
  async list(@Query() query: ListArtistsQueryDto) {
    const data = await this.artists.list(query);
    return { data, message: 'Artists retrieved successfully' };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('ARTISTS', 'view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an artist by id' })
  async getById(@Param('id') id: string) {
    const data = await this.artists.getById(id);
    return { data, message: 'Artist retrieved successfully' };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('ARTISTS', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an artist' })
  async create(@Body() dto: CreateArtistDto) {
    const data = await this.artists.create(dto);
    return { data, message: 'Artist created successfully' };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('ARTISTS', 'edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an artist' })
  async update(@Param('id') id: string, @Body() dto: UpdateArtistDto) {
    const data = await this.artists.update(id, dto);
    return { data, message: 'Artist updated successfully' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('ARTISTS', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an artist (blocked while assigned to events)' })
  async delete(@Param('id') id: string) {
    const data = await this.artists.delete(id);
    return { data, message: 'Artist deleted successfully' };
  }
}
