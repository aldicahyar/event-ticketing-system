/**
 * Admin user-management types — mirrors backend/src/modules/users.
 * Keep in sync when the API contract changes.
 */

export interface UserProfile {
  id: string;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role_code: string;
  provider: string;
  avatar?: string | null;
  is_active: boolean;
  email_verified: boolean;
  failed_login_attempts: number;
  locked_until?: string | null;
  last_login_at?: string | null;
  last_failed_login_at?: string | null;
  password_changed_at?: string | null;
  created_at: string;
  updated_at: string;
  profile?: UserProfile | null;
  /** Computed server-side: locked_until is in the future. */
  isLocked: boolean;
  role?: {
    code: string;
    name: string;
    is_active: boolean;
    is_system: boolean;
  } | null;
  _count?: { bookings: number };
}

export interface UserListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UserListResult {
  items: AdminUser[];
  meta: UserListMeta;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  unverified: number;
  locked: number;
  byRole: Array<{ role_code: string; count: number }>;
}

export type UserSortField =
  | 'created_at'
  | 'name'
  | 'email'
  | 'role_code'
  | 'last_login_at';

export interface ListUsersQuery {
  search?: string;
  role_code?: string;
  is_active?: boolean;
  email_verified?: boolean;
  provider?: string;
  locked?: boolean;
  page?: number;
  limit?: number;
  sortBy?: UserSortField;
  sort_order?: 'asc' | 'desc';
}

// ===== DTOs (request bodies) =====
export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
  role_code: string;
  email_verified?: boolean;
  is_active?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  role_code?: string;
  is_active?: boolean;
  email_verified?: boolean;
}
