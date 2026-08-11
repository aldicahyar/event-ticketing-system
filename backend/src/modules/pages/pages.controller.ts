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
import { PagesService } from './pages.service';
import { CreatePageDto, UpdatePageDto, ListPagesQueryDto } from './dto/page.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Admin CRUD for CMS pages. All routes gated by the `PAGES` menu permission.
 */
@ApiTags('Pages')
@Controller('pages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  @RequirePermission('PAGES', 'view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List pages (incl. drafts), search + filter + paginate' })
  async list(@Query() query: ListPagesQueryDto) {
    const data = await this.pages.list(query);
    return { data, message: 'Pages retrieved successfully' };
  }

  @Get(':id')
  @RequirePermission('PAGES', 'view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a page by id (admin)' })
  async detail(@Param('id') id: string) {
    const data = await this.pages.getById(id);
    return { data, message: 'Page retrieved successfully' };
  }

  @Post()
  @RequirePermission('PAGES', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a page' })
  async create(@Body() dto: CreatePageDto, @CurrentUser() user: any) {
    const data = await this.pages.create(dto, user.id);
    return { data, message: 'Page created successfully' };
  }

  @Patch(':id')
  @RequirePermission('PAGES', 'edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a page' })
  async update(@Param('id') id: string, @Body() dto: UpdatePageDto, @CurrentUser() user: any) {
    const data = await this.pages.update(id, dto, user.id);
    return { data, message: 'Page updated successfully' };
  }

  @Delete(':id')
  @RequirePermission('PAGES', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a page' })
  async remove(@Param('id') id: string) {
    const data = await this.pages.remove(id);
    return { data, message: 'Page deleted successfully' };
  }
}

/**
 * Public, unauthenticated read access to PUBLISHED pages only.
 * Separate controller + path prefix so it never collides with the admin
 * `GET /pages/:id` route and never leaks drafts.
 */
@ApiTags('Pages (public)')
@Controller('public/pages')
export class PublicPagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List published pages' })
  async list() {
    const data = await this.pages.listPublished();
    return { data, message: 'Published pages retrieved successfully' };
  }

  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a published page by slug' })
  async bySlug(@Param('slug') slug: string) {
    const data = await this.pages.getPublishedBySlug(slug);
    return { data, message: 'Page retrieved successfully' };
  }
}
