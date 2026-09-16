import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateArtistDto, UpdateArtistDto, ListArtistsQueryDto } from './dto/artist.dto';

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public: active artists with a count of upcoming events they perform at.
   * Artists with no upcoming events are hidden from the public lineup.
   */
  async listForLineup() {
    const now = new Date();

    return this.prisma.t_mtr_artists.findMany({
      where: {
        is_active: true,
        events: {
          some: {
            event: {
              status: { in: ['PUBLISHED', 'ONGOING'] },
              event_date: { gte: now },
            },
          },
        },
      },
      include: {
        genre: { select: { id: true, code: true, name: true } },
        events: {
          where: {
            event: {
              status: { in: ['PUBLISHED', 'ONGOING'] },
              event_date: { gte: now },
            },
          },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Public: artist detail by code. Throws when missing or inactive.
   */
  async getByCode(code: string) {
    const artist = await this.prisma.t_mtr_artists.findUnique({
      where: { code: code.toUpperCase() },
      include: { genre: { select: { id: true, code: true, name: true } } },
    });

    if (!artist || !artist.is_active) {
      throw new NotFoundException(`Artist with code '${code}' not found`);
    }

    return artist;
  }

  /**
   * Public: upcoming published/ongoing events featuring this artist,
   * with venue + genre for the public detail page.
   */
  async listEvents(code: string) {
    const artist = await this.getByCode(code);
    const now = new Date();

    const pivots = await this.prisma.t_trx_event_artists.findMany({
      where: { artist_id: artist.id },
      select: {
        event: {
          include: {
            venue: { select: { name: true, city: true, address: true, capacity: true } },
            genre: { select: { id: true, code: true, name: true } },
            ticket_tiers: true,
            _count: { select: { seats: { where: { status: 'AVAILABLE' } } } },
          },
        },
      },
      orderBy: { event: { start_date_time: 'asc' } },
    });

    return pivots
      .map((p) => p.event)
      .filter((event) => {
        // Mirror filterUpcomingEvents on the frontend: event_date is the
        // canonical "when" (see autoCompletePastEvents); start_date_time is
        // only a fallback for legacy rows.
        const dateStr = event.event_date || event.start_date_time;
        if (!dateStr) return false;
        return (
          (event.status === 'PUBLISHED' || event.status === 'ONGOING') &&
          new Date(dateStr) >= now
        );
      });
  }

  async list(query?: ListArtistsQueryDto) {
    const where: Prisma.t_mtr_artistsWhereInput = {};

    if (query?.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { origin: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query?.is_active !== undefined) {
      where.is_active = query.is_active;
    }

    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;

    return this.prisma.t_mtr_artists.findMany({
      where,
      include: { genre: { select: { id: true, code: true, name: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async getById(id: string) {
    const artist = await this.prisma.t_mtr_artists.findUnique({
      where: { id },
      include: { genre: { select: { id: true, code: true, name: true } } },
    });

    if (!artist) {
      throw new NotFoundException(`Artist with ID '${id}' not found`);
    }

    return artist;
  }

  async create(dto: CreateArtistDto) {
    const code = (dto.code?.trim() || this.generateCode(dto.name)).toUpperCase();

    if (!code) {
      throw new BadRequestException(
        'A code could not be generated from the name; provide a code explicitly',
      );
    }

    const existing = await this.prisma.t_mtr_artists.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException(`Artist with code '${code}' already exists`);
    }

    const existingName = await this.prisma.t_mtr_artists.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existingName) {
      throw new ConflictException(`Artist with name '${dto.name.trim()}' already exists`);
    }

    if (dto.genre_id) {
      const genre = await this.prisma.t_mtr_genres.findUnique({ where: { id: dto.genre_id } });
      if (!genre || !genre.is_active) {
        throw new BadRequestException(`Genre with ID '${dto.genre_id}' not found or inactive`);
      }
    }

    return this.prisma.t_mtr_artists.create({
      data: {
        code,
        name: dto.name.trim(),
        genre_id: dto.genre_id || null,
        origin: dto.origin?.trim() || null,
        bio: dto.bio?.trim() || null,
        image_url: dto.image_url || null,
        is_active: dto.is_active !== undefined ? dto.is_active : true,
      },
      include: { genre: { select: { id: true, code: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateArtistDto) {
    const existing = await this.getById(id);

    const data: Prisma.t_mtr_artistsUpdateInput = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name !== existing.name) {
        const clash = await this.prisma.t_mtr_artists.findUnique({ where: { name } });
        if (clash) {
          throw new ConflictException(`Artist with name '${name}' already exists`);
        }
      }
      data.name = name;
    }

    if (dto.origin !== undefined) data.origin = dto.origin?.trim() || null;
    if (dto.bio !== undefined) data.bio = dto.bio?.trim() || null;
    if (dto.image_url !== undefined) data.image_url = dto.image_url || null;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase();
      if (code !== existing.code) {
        const clash = await this.prisma.t_mtr_artists.findUnique({ where: { code } });
        if (clash) {
          throw new ConflictException(`Artist with code '${code}' already exists`);
        }
        data.code = code;
      }
    }

    if (dto.genre_id !== undefined) {
      if (dto.genre_id === null) {
        data.genre = { disconnect: true };
      } else {
        const genre = await this.prisma.t_mtr_genres.findUnique({ where: { id: dto.genre_id } });
        if (!genre || !genre.is_active) {
          throw new BadRequestException(`Genre with ID '${dto.genre_id}' not found or inactive`);
        }
        data.genre = { connect: { id: dto.genre_id } };
      }
    }

    return this.prisma.t_mtr_artists.update({
      where: { id },
      data,
      include: { genre: { select: { id: true, code: true, name: true } } },
    });
  }

  async delete(id: string) {
    await this.getById(id);

    const inUseCount = await this.prisma.t_trx_event_artists.count({
      where: { artist_id: id },
    });

    if (inUseCount > 0) {
      throw new BadRequestException(
        'Cannot delete artist that is currently assigned to events. Deactivate it instead.',
      );
    }

    await this.prisma.t_mtr_artists.delete({ where: { id } });

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
