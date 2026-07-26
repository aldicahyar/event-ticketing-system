import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Generic role-based guard. Compares user.roleCode against required roles.
 * Required roles are set via @Roles('ADMIN', 'ORGANIZER') decorator.
 *
 * Supports both old Role enum (legacy) and new roleCode string (RBAC).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // New RBAC: use roleCode (string). Fallback to legacy role (enum/string).
    const userRole = user.roleCode ?? user.role;
    if (!userRole) return false;

    return requiredRoles.includes(userRole);
  }
}
