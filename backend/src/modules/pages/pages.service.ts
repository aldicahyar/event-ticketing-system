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
  ogImage: { select: { id: true, url: true, alt: true } },
} satisfies Prisma.PageInclude;

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

    const where: Prisma.PageWhereInput = {};
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status as PageStatus;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.page.count({ where }),
      this.prisma.page.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
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
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: PAGE_INCLUDE,
    });
    if (!page) throw new NotFoundException(`Page '${id}' not found`);
    return page;
  }

  async create(dto: CreatePageDto, actorId?: string) {
    const slug = dto.slug.trim().toLowerCase();
    const clash = await this.prisma.page.findUnique({ where: { slug } });
    if (clash) throw new ConflictException(`Page slug '${slug}' already exists`);

    await this.assertOgImageExists(dto.ogImageId);

    const status = (dto.status ?? 'DRAFT') as PageStatus;
    return this.prisma.page.create({
      data: {
        slug,
        title: dto.title.trim(),
        excerpt: dto.excerpt?.trim() || null,
        content: this.sanitizer.sanitize(dto.content),
        status,
        seoTitle: dto.seoTitle?.trim() || null,
        seoDescription: dto.seoDescription?.trim() || null,
        ogImageId: dto.ogImageId || null,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        createdBy: actorId,
        updatedBy: actorId,
      },
      include: PAGE_INCLUDE,
    });
  }

  async update(id: string, dto: UpdatePageDto, actorId?: string) {
    const existing = await this.prisma.page.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Page '${id}' not found`);

    const data: Prisma.PageUncheckedUpdateInput = { updatedBy: actorId };

    if (dto.slug !== undefined) {
      const slug = dto.slug.trim().toLowerCase();
      if (slug !== existing.slug) {
        const clash = await this.prisma.page.findUnique({ where: { slug } });
        if (clash) throw new ConflictException(`Page slug '${slug}' already exists`);
        data.slug = slug;
      }
    }
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt.trim() || null;
    if (dto.content !== undefined) data.content = this.sanitizer.sanitize(dto.content);
    if (dto.seoTitle !== undefined) data.seoTitle = dto.seoTitle.trim() || null;
    if (dto.seoDescription !== undefined) {
      data.seoDescription = dto.seoDescription.trim() || null;
    }
    if (dto.ogImageId !== undefined) {
      await this.assertOgImageExists(dto.ogImageId);
      data.ogImageId = dto.ogImageId || null;
    }

    if (dto.status !== undefined && dto.status !== existing.status) {
      data.status = dto.status as PageStatus;
      // Stamp publishedAt the first time it goes live; keep it on re-publish.
      if (dto.status === 'PUBLISHED') {
        data.publishedAt = existing.publishedAt ?? new Date();
      }
    }

    return this.prisma.page.update({
      where: { id },
      data,
      include: PAGE_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.page.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ============================================================
  // PUBLIC
  // ============================================================

  /** Public list of published pages (for a sitemap / footer nav). */
  async listPublished() {
    return this.prisma.page.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { title: 'asc' },
      select: { slug: true, title: true, excerpt: true, updatedAt: true },
    });
  }

  /** A single published page by slug. Drafts are treated as not found. */
  async getPublishedBySlug(slug: string) {
    const page = await this.prisma.page.findFirst({
      where: { slug: slug.trim().toLowerCase(), status: 'PUBLISHED' },
      include: PAGE_INCLUDE,
    });
    if (!page) throw new NotFoundException(`Page '${slug}' not found`);
    return page;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async assertOgImageExists(ogImageId?: string | null) {
    if (!ogImageId) return;
    const media = await this.prisma.media.findUnique({ where: { id: ogImageId } });
    if (!media) throw new BadRequestException(`OG image media '${ogImageId}' not found`);
  }
}
