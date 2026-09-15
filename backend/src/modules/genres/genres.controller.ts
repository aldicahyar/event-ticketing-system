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
import { GenresService } from './genres.service';
import { CreateGenreDto, UpdateGenreDto, ListGenresQueryDto } from './dto/genre.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Genres')
@Controller('genres')
export class GenresController {
  constructor(private readonly genres: GenresService) {}

  /** Public: active genres only, for the event form & public catalog. */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active genres (public)' })
  async listActive() {
    const data = await this.genres.listActive();
    return { data, message: 'Active genres retrieved successfully' };
  }

  /** Must be declared before :id so 'admin' is not captured as a param. */
  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('GENRES', 'view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all genres with search/status filter (admin)' })
  async list(@Query() query: ListGenresQueryDto) {
    const data = await this.genres.list(query);
    return { data, message: 'Genres retrieved successfully' };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a genre by id' })
  async getById(@Param('id') id: string) {
    const data = await this.genres.getById(id);
    return { data, message: 'Genre retrieved successfully' };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('GENRES', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a genre' })
  async create(@Body() dto: CreateGenreDto) {
    const data = await this.genres.create(dto);
    return { data, message: 'Genre created successfully' };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('GENRES', 'edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a genre' })
  async update(@Param('id') id: string, @Body() dto: UpdateGenreDto) {
    const data = await this.genres.update(id, dto);
    return { data, message: 'Genre updated successfully' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('GENRES', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a genre (blocked while assigned to events)' })
  async delete(@Param('id') id: string) {
    const data = await this.genres.delete(id);
    return { data, message: 'Genre deleted successfully' };
  }
}
