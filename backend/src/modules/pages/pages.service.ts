import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, PageStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { HtmlSanitizerService } from '../../common/security/html-sanitizer.service';
import { CreatePageDto, UpdatePageDto, ListPagesQueryDto } from './dto/page.dto';

/** Relation payload shared by admin reads so the OG image comes along. */
const PAGE_INCLUDE = {
  og_image: { select: { id: true, url: true, alt: true } },
} satisfies Prisma.t_mtr_pagesInclude;

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sanitizer: HtmlSanitizerService,
  ) {}

  // ============================================================
  // ADMIN
  // ============================================================

  async list(query: ListPagesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.t_mtr_pagesWhereInput = {};
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status as PageStatus;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.t_mtr_pages.count({ where }),
      this.prisma.t_mtr_pages.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: PAGE_INCLUDE,
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
    const page = await this.prisma.t_mtr_pages.findUnique({
      where: { id },
      include: PAGE_INCLUDE,
    });
    if (!page) throw new NotFoundException(`Page '${id}' not found`);
    return page;
  }

  async create(dto: CreatePageDto, actorId?: string) {
    const slug = dto.slug.trim().toLowerCase();
    const clash = await this.prisma.t_mtr_pages.findUnique({ where: { slug } });
    if (clash) throw new ConflictException(`Page slug '${slug}' already exists`);

    await this.assertOgImageExists(dto.og_image_id);

    const status = (dto.status ?? 'DRAFT') as PageStatus;
    return this.prisma.t_mtr_pages.create({
      data: {
        slug,
        title: dto.title.trim(),
        excerpt: dto.excerpt?.trim() || null,
        content: this.sanitizer.sanitize(dto.content),
        status,
        seo_title: dto.seo_title?.trim() || null,
        seo_description: dto.seo_description?.trim() || null,
        og_image_id: dto.og_image_id || null,
        published_at: status === 'PUBLISHED' ? new Date() : null,
        created_by: actorId,
        updated_by: actorId,
      },
      include: PAGE_INCLUDE,
    });
  }

  async update(id: string, dto: UpdatePageDto, actorId?: string) {
    const existing = await this.prisma.t_mtr_pages.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Page '${id}' not found`);

    const data: Prisma.t_mtr_pagesUncheckedUpdateInput = { updated_by: actorId };

    if (dto.slug !== undefined) {
      const slug = dto.slug.trim().toLowerCase();
      if (slug !== existing.slug) {
        const clash = await this.prisma.t_mtr_pages.findUnique({ where: { slug } });
        if (clash) throw new ConflictException(`Page slug '${slug}' already exists`);
        data.slug = slug;
      }
    }
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt.trim() || null;
    if (dto.content !== undefined) data.content = this.sanitizer.sanitize(dto.content);
    if (dto.seo_title !== undefined) data.seo_title = dto.seo_title.trim() || null;
    if (dto.seo_description !== undefined) {
      data.seo_description = dto.seo_description.trim() || null;
    }
    if (dto.og_image_id !== undefined) {
      await this.assertOgImageExists(dto.og_image_id);
      data.og_image_id = dto.og_image_id || null;
    }

    if (dto.status !== undefined && dto.status !== existing.status) {
      data.status = dto.status as PageStatus;
      // Stamp published_at the first time it goes live; keep it on re-publish.
      if (dto.status === 'PUBLISHED') {
        data.published_at = existing.published_at ?? new Date();
      }
    }

    return this.prisma.t_mtr_pages.update({
      where: { id },
      data,
      include: PAGE_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.t_mtr_pages.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ============================================================
  // PUBLIC
  // ============================================================

  /** Public list of published pages (for a sitemap / footer nav). */
  async listPublished() {
    return this.prisma.t_mtr_pages.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { title: 'asc' },
      select: { slug: true, title: true, excerpt: true, updated_at: true },
    });
  }

  /** A single published page by slug. Drafts are treated as not found. */
  async getPublishedBySlug(slug: string) {
    const page = await this.prisma.t_mtr_pages.findFirst({
      where: { slug: slug.trim().toLowerCase(), status: 'PUBLISHED' },
      include: PAGE_INCLUDE,
    });
    if (!page) throw new NotFoundException(`Page '${slug}' not found`);
    return page;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async assertOgImageExists(og_image_id?: string | null) {
    if (!og_image_id) return;
    const media = await this.prisma.t_mtr_media.findUnique({ where: { id: og_image_id } });
    if (!media) throw new BadRequestException(`OG image media '${og_image_id}' not found`);
  }
}
