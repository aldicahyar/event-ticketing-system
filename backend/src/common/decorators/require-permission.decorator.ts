import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

/**
 * Decorator to require a specific RBAC permission for an endpoint.
 *
 * @param menuCode - The menu code from the permissions matrix (e.g. 'TIER_SETTINGS')
 * @param action - The required action. Defaults to 'view'.
 *   If omitted, the guard auto-maps HTTP method:
 *     GET -> view, POST -> create, PUT/PATCH -> edit, DELETE -> delete
 *
 * Examples:
 *   @RequirePermission('TIER_SETTINGS')           // auto-detect from HTTP method
 *   @RequirePermission('TIER_SETTINGS', 'edit')     // explicit action
 *   @RequirePermission('RBAC_ROLES', 'view')       // read access
 */
export const RequirePermission = (menuCode: string, action?: string) =>
  SetMetadata(PERMISSION_KEY, { menuCode, action });
