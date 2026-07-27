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
  seo_title?: string | null;
  seo_description?: string | null;
  og_image_id?: string | null;
  ogImage?: PageOgImage | null;
  published_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

/** Lightweight shape returned by the public list endpoint. */
export interface PageSummary {
  slug: string;
  title: string;
  excerpt?: string | null;
  updated_at: string;
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
  seo_title?: string;
  seo_description?: string;
  og_image_id?: string;
}

export interface UpdatePageDto {
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  status?: PageStatus;
  seo_title?: string;
  seo_description?: string;
  og_image_id?: string | null;
}
