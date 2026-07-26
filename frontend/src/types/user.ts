/**
 * Admin user-management types — mirrors backend/src/modules/users.
 * Keep in sync when the API contract changes.
 */

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  roleCode: string;
  provider: string;
  avatar?: string | null;
  isActive: boolean;
  emailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
  lastFailedLoginAt?: string | null;
  passwordChangedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Computed server-side: lockedUntil is in the future. */
  isLocked: boolean;
  role?: {
    code: string;
    name: string;
    isActive: boolean;
    isSystem: boolean;
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
  byRole: Array<{ roleCode: string; count: number }>;
}

export type UserSortField =
  | 'createdAt'
  | 'name'
  | 'email'
  | 'roleCode'
  | 'lastLoginAt';

export interface ListUsersQuery {
  search?: string;
  roleCode?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  provider?: string;
  locked?: boolean;
  page?: number;
  limit?: number;
  sortBy?: UserSortField;
  sortOrder?: 'asc' | 'desc';
}

// ===== DTOs (request bodies) =====
export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
  roleCode: string;
  emailVerified?: boolean;
  isActive?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  roleCode?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}
