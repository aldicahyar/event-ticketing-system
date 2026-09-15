/** Mirrors backend t_mtr_genres. */
export interface Genre {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGenreDto {
  name: string;
  /** Uppercase code; auto-generated from name when omitted. */
  code?: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateGenreDto {
  name?: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}
