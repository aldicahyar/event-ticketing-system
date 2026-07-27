import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { Readable } from 'node:stream';
import { MediaService } from './media.service';
import { ListMediaQueryDto, UpdateMediaDto } from './dto/media.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Minimal shape of a @fastify/multipart file. Declared locally so this module
 * does not hard-depend on the plugin's ambient type augmentation.
 */
interface MultipartFile {
  filename: string;
  mimetype: string;
  file: Readable;
}
type MultipartRequest = FastifyRequest & {
  file: () => Promise<MultipartFile | undefined>;
};

@ApiTags('Media')
@Controller('media')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload')
  @RequirePermission('MEDIA', 'create')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a media file (multipart, field name "file")' })
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Req() req: FastifyRequest,
    @Query('folder') folder: string | undefined,
    @CurrentUser() user: any,
  ) {
    let data: MultipartFile | undefined;
    try {
      data = await (req as MultipartRequest).file();
    } catch (err: any) {
      // @fastify/multipart throws when the configured fileSize limit is exceeded.
      if (err?.code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new PayloadTooLargeException('File exceeds the maximum allowed size');
      }
      throw err;
    }

    if (!data) {
      throw new BadRequestException('No file provided (expected multipart field "file")');
    }

    const result = await this.media.upload(
      {
        original_name: data.filename,
        mime_type: data.mimetype,
        content: data.file,
        folder,
      },
      user.id,
    );
    return { data: result, message: 'File uploaded successfully' };
  }

  @Get()
  @RequirePermission('MEDIA', 'view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List media library (search, folder, paginate)' })
  async list(@Query() query: ListMediaQueryDto) {
    const data = await this.media.list(query);
    return { data, message: 'Media retrieved successfully' };
  }

  @Get(':id')
  @RequirePermission('MEDIA', 'view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single media item' })
  async detail(@Param('id') id: string) {
    const data = await this.media.getById(id);
    return { data, message: 'Media retrieved successfully' };
  }

  @Patch(':id')
  @RequirePermission('MEDIA', 'edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update media metadata (alt, folder)' })
  async update(@Param('id') id: string, @Body() dto: UpdateMediaDto) {
    const data = await this.media.update(id, dto);
    return { data, message: 'Media updated successfully' };
  }

  @Delete(':id')
  @RequirePermission('MEDIA', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a media item (row + file)' })
  async remove(@Param('id') id: string) {
    const data = await this.media.remove(id);
    return { data, message: 'Media deleted successfully' };
  }
}
