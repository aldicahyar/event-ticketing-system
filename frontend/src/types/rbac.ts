/**
 * RBAC TypeScript types — mirrors OpenAPI schema at docs/api/rbac-openapi.yaml.
 * Keep in sync when API contract changes.
 */

export interface PermissionFlags {
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  name_en?: string | null;
  description?: string | null;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  created_by?: string | null;
  created_at: string;
  updated_by?: string | null;
  updated_at: string;
  _count?: { users?: number; permissions?: number };
}

export interface Menu {
  id: string;
  code: string;
  name: string;
  name_en?: string | null;
  parent_code?: string | null;
  icon?: string | null;
  slug?: string | null;
  order: number;
  is_new_tab: boolean;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_by?: string | null;
  updated_at: string;
}

export interface RoleMenuPermission extends PermissionFlags {
  id: string;
  role_code: string;
  menu_code: string;
  is_active: boolean;
  menu?: { code: string; name: string };
}

export interface SidebarItem {
  code: string;
  name: string;
  name_en?: string | null;
  parent_code?: string | null;
  icon?: string | null;
  slug?: string | null;
  order: number;
  is_new_tab: boolean;
  permissions: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
  /** Filled in by nestSidebarItems() when building tree */
  children?: SidebarItem[];
}

export interface PermissionCell {
  menu_code: string;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

// ===== DTOs (request bodies) =====
export interface CreateRoleDto {
  code: string;
  name: string;
  name_en?: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateRoleDto {
  name?: string;
  name_en?: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface CreateMenuDto {
  code: string;
  name: string;
  name_en?: string;
  parent_code?: string | null;
  icon?: string;
  slug?: string;
  order?: number;
  is_new_tab?: boolean;
}

export interface UpdateMenuDto {
  name?: string;
  name_en?: string;
  parent_code?: string | null;
  icon?: string;
  slug?: string;
  order?: number;
  is_new_tab?: boolean;
  is_active?: boolean;
}

export interface AssignRoleDto {
  role_code: string;
}
