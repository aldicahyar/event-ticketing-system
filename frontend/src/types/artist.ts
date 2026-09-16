/** Mirrors backend t_mtr_artists. */
export interface Artist {
  id: string;
  code: string;
  name: string;
  genre_id: string | null;
  origin: string | null;
  bio: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Only present in responses that include the relation. */
  genre?: {
    id: string;
    code: string;
    name: string;
  } | null;
  /** Only present in the public lineup response. */
  events?: { id: string }[];
}

export interface CreateArtistDto {
  name: string;
  /** Uppercase code; auto-generated from name when omitted. */
  code?: string;
  genre_id?: string;
  origin?: string;
  bio?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface UpdateArtistDto {
  name?: string;
  code?: string;
  genre_id?: string | null;
  origin?: string | null;
  bio?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

export interface ListArtistsQuery {
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}
