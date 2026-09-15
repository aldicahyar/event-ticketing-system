import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateGenreDto, UpdateGenreDto, ListGenresQueryDto } from './dto/genre.dto';

@Injectable()
export class GenresService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query?: ListGenresQueryDto) {
    const where: Prisma.t_mtr_genresWhereInput = {};

    if (query?.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query?.is_active !== undefined) {
      where.is_active = query.is_active;
    }

    return this.prisma.t_mtr_genres.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async listActive() {
    return this.prisma.t_mtr_genres.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string) {
    const genre = await this.prisma.t_mtr_genres.findUnique({
      where: { id },
    });

    if (!genre) {
      throw new NotFoundException(`Genre with ID '${id}' not found`);
    }

    return genre;
  }

  async create(dto: CreateGenreDto) {
    const code = (dto.code?.trim() || this.generateCode(dto.name)).toUpperCase();

    if (!code) {
      throw new BadRequestException(
        'A code could not be generated from the name; provide a code explicitly',
      );
    }

    const existing = await this.prisma.t_mtr_genres.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException(`Genre with code '${code}' already exists`);
    }

    return this.prisma.t_mtr_genres.create({
      data: {
        name: dto.name.trim(),
        code,
        description: dto.description?.trim() || null,
        is_active: dto.is_active !== undefined ? dto.is_active : true,
      },
    });
  }

  async update(id: string, dto: UpdateGenreDto) {
    const existing = await this.getById(id);

    const data: Prisma.t_mtr_genresUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    if (dto.is_active !== undefined) {
      data.is_active = dto.is_active;
    }

    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase();
      if (code !== existing.code) {
        const clash = await this.prisma.t_mtr_genres.findUnique({
          where: { code },
        });
        if (clash) {
          throw new ConflictException(`Genre with code '${code}' already exists`);
        }
        data.code = code;
      }
    }

    return this.prisma.t_mtr_genres.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.getById(id);

    const inUseCount = await this.prisma.t_trx_events.count({
      where: { genre_id: id },
    });

    if (inUseCount > 0) {
      throw new BadRequestException(
        'Cannot delete genre that is currently assigned to events. Deactivate it instead.',
      );
    }

    await this.prisma.t_mtr_genres.delete({
      where: { id },
    });

    return { id, deleted: true };
  }

  private generateCode(name: string): string {
    return name
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  }
}
