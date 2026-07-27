import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { StorageService, StorageInput } from '../../common/storage/storage.service';
import { ListMediaQueryDto, UpdateMediaDto } from './dto/media.dto';

/** Image mime types the library accepts. Kept narrow on purpose. */
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
]);

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Persist an uploaded file: stream to storage, then record metadata.
   * If the DB write fails after the file is stored, the orphan file is removed
   * so storage and DB stay consistent.
   */
  async upload(
    file: StorageInput & { folder?: string },
    uploadedBy?: string,
  ) {
    if (!ALLOWED_MIME.has(file.mimeType)) {
      throw new BadRequestException(
        `Unsupported file type '${file.mimeType}'. Allowed: ${[...ALLOWED_MIME].join(', ')}`,
      );
    }

    const stored = await this.storage.save(file);

    try {
      return await this.prisma.media.create({
        data: {
          filename: stored.filename,
          originalName: file.originalName,
          url: stored.url,
          mimeType: file.mimeType,
          size: stored.size,
          folder: file.folder?.trim() || 'general',
          uploadedBy,
        },
      });
    } catch (err) {
      await this.storage.delete(stored.filename);
      this.logger.error(`Media DB write failed, rolled back file ${stored.filename}`);
      throw err;
    }
  }

  async list(query: ListMediaQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;

    const where: Prisma.MediaWhereInput = {};
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: 'insensitive' } },
        { alt: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (query.folder) where.folder = query.folder;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.media.count({ where }),
      this.prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getById(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException(`Media '${id}' not found`);
    return media;
  }

  async update(id: string, dto: UpdateMediaDto) {
    await this.getById(id);
    return this.prisma.media.update({
      where: { id },
      data: {
        ...(dto.alt !== undefined && { alt: dto.alt }),
        ...(dto.folder !== undefined && { folder: dto.folder.trim() || 'general' }),
      },
    });
  }

  /** Remove both the DB row and the file on disk. */
  async remove(id: string) {
    const media = await this.getById(id);

    // Detach from any page still using it as OG image so the FK doesn't block.
    await this.prisma.page.updateMany({
      where: { ogImageId: id },
      data: { ogImageId: null },
    });

    await this.prisma.media.delete({ where: { id } });
    await this.storage.delete(media.filename);

    return { id, deleted: true };
  }
}
