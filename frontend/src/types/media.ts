/**
 * Media library types — mirrors backend/src/modules/media.
 */

export interface AdminMedia {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  folder?: string | null;
  uploadedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface MediaListResult {
  items: AdminMedia[];
  meta: MediaListMeta;
}

export interface ListMediaQuery {
  search?: string;
  folder?: string;
  page?: number;
  limit?: number;
}
