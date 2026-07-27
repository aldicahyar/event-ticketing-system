import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../../modules/rbac/rbac.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

type Action = 'view' | 'create' | 'edit' | 'delete';

const METHOD_ACTION_MAP: Record<string, Action> = {
  GET: 'view',
  POST: 'create',
  PUT: 'edit',
  PATCH: 'edit',
  DELETE: 'delete',
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const perm = this.reflector.getAllAndOverride<{ menu_code: string; action?: string }>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!perm) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const role_code = user.role_code ?? user.role;
    if (!role_code) return false;

    const action = (perm.action ?? METHOD_ACTION_MAP[context.switchToHttp().getRequest().method] ?? 'view') as Action;

    const allowed = await this.rbacService.hasPermission(role_code, perm.menu_code, action);

    if (!allowed) {
      throw new ForbiddenException(
        `Role '${role_code}' does not have '${action}' permission on '${perm.menu_code}'`,
      );
    }

    return true;
  }
}
