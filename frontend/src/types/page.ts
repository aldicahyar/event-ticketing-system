/**
 * CMS Page types — mirrors backend/src/modules/pages.
 */

export type PageStatus = 'DRAFT' | 'PUBLISHED';

export interface PageOgImage {
  id: string;
  url: string;
  alt?: string | null;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string; // sanitized HTML
  status: PageStatus;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageId?: string | null;
  ogImage?: PageOgImage | null;
  publishedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Lightweight shape returned by the public list endpoint. */
export interface PageSummary {
  slug: string;
  title: string;
  excerpt?: string | null;
  updatedAt: string;
}

export interface PageListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PageListResult {
  items: CmsPage[];
  meta: PageListMeta;
}

export interface ListPagesQuery {
  search?: string;
  status?: PageStatus;
  page?: number;
  limit?: number;
}

// ===== DTOs =====
export interface CreatePageDto {
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  status?: PageStatus;
  seoTitle?: string;
  seoDescription?: string;
  ogImageId?: string;
}

export interface UpdatePageDto {
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  status?: PageStatus;
  seoTitle?: string;
  seoDescription?: string;
  ogImageId?: string | null;
}
