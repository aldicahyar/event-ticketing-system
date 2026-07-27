/**
 * Media library types — mirrors backend/src/modules/media.
 */

export interface AdminMedia {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  mime_type: string;
  size: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  folder?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
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
