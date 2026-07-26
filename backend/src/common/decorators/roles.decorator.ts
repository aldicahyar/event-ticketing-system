import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/**
 * Decorator to set required role codes for an endpoint.
 * Example: @Roles('ADMIN') or @Roles('ADMIN', 'ORGANIZER')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
