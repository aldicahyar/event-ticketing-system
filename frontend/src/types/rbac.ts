/**
 * RBAC TypeScript types — mirrors OpenAPI schema at docs/api/rbac-openapi.yaml.
 * Keep in sync when API contract changes.
 */

export interface PermissionFlags {
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  nameEn?: string | null;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  createdBy?: string | null;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt: string;
  _count?: { users?: number; permissions?: number };
}

export interface Menu {
  id: string;
  code: string;
  name: string;
  nameEn?: string | null;
  parentCode?: string | null;
  icon?: string | null;
  slug?: string | null;
  order: number;
  isNewTab: boolean;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt: string;
}

export interface RoleMenuPermission extends PermissionFlags {
  id: string;
  roleCode: string;
  menuCode: string;
  isActive: boolean;
  menu?: { code: string; name: string };
}

export interface SidebarItem {
  code: string;
  name: string;
  nameEn?: string | null;
  parentCode?: string | null;
  icon?: string | null;
  slug?: string | null;
  order: number;
  isNewTab: boolean;
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
  /** Filled in by nestSidebarItems() when building tree */
  children?: SidebarItem[];
}

export interface PermissionCell {
  menuCode: string;
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

// ===== DTOs (request bodies) =====
export interface CreateRoleDto {
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateRoleDto {
  name?: string;
  nameEn?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateMenuDto {
  code: string;
  name: string;
  nameEn?: string;
  parentCode?: string | null;
  icon?: string;
  slug?: string;
  order?: number;
  isNewTab?: boolean;
}

export interface UpdateMenuDto {
  name?: string;
  nameEn?: string;
  parentCode?: string | null;
  icon?: string;
  slug?: string;
  order?: number;
  isNewTab?: boolean;
  isActive?: boolean;
}

export interface AssignRoleDto {
  roleCode: string;
}
