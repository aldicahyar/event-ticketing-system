import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  CreateMenuDto,
  UpdateMenuDto,
  ReplacePermissionsDto,
} from './dto/rbac.dto';

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);
  private readonly SIDEBAR_CACHE_PREFIX = 'menu:sidebar:';
  private readonly SIDEBAR_CACHE_TTL_SEC = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ============================================================
  // SIDEBAR CONSUMER
  // ============================================================

  /**
   * Get flat list of menus visible to the user (can_view=true).
   * Cache per role_code in Redis for 5 minutes.
   */
  async getMySidebar(role_code: string) {
    const cacheKey = `${this.SIDEBAR_CACHE_PREFIX}${role_code}`;
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.t_mtr_role_menu_permissions.findMany({
      where: {
        role_code,
        can_view: true,
        is_active: true,
        menu: { is_active: true },
      },
      include: {
        menu: {
          select: {
            code: true,
            name: true,
            name_en: true,
            parent_code: true,
            icon: true,
            slug: true,
            order: true,
            is_new_tab: true,
          },
        },
      },
      orderBy: { menu: { order: 'asc' } },
    });

    const result = rows.map((r) => ({
      ...r.menu,
      permissions: {
        can_view: r.can_view,
        can_create: r.can_create,
        can_edit: r.can_edit,
        can_delete: r.can_delete,
      },
    }));

    await this.redis.set(cacheKey, result, this.SIDEBAR_CACHE_TTL_SEC);
    return result;
  }

  /** Invalidate sidebar cache for one role (or all roles with '*'). */
  async invalidateSidebarCache(role_code?: string) {
    try {
      if (role_code) {
        await this.redis.del(`${this.SIDEBAR_CACHE_PREFIX}${role_code}`);
      } else {
        // Best-effort pattern delete — Redis may not have KEYS in prod.
        // For dev/local this is fine. In prod use SCAN.
        await this.redis.delPattern(`${this.SIDEBAR_CACHE_PREFIX}*`);
      }
    } catch (e) {
      this.logger.warn(`sidebar cache invalidation failed: ${(e as Error).message}`);
    }
  }

  // ============================================================
  // ROLES
  // ============================================================

  async listRoles(filters: { is_active?: boolean; includePermissions?: boolean } = {}) {
    const where: Prisma.t_mtr_rolesWhereInput = {};
    if (typeof filters.is_active === 'boolean') where.is_active = filters.is_active;

    return this.prisma.t_mtr_roles.findMany({
      where,
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      include: filters.includePermissions
        ? { _count: { select: { permissions: true, users: true } } }
        : { _count: { select: { users: true } } },
    });
  }

  async getRole(code: string) {
    const role = await this.prisma.t_mtr_roles.findUnique({ where: { code } });
    if (!role) throw new NotFoundException(`Role with code '${code}' not found`);
    return role;
  }

  async createRole(dto: CreateRoleDto, actorId: string) {
    const existing = await this.prisma.t_mtr_roles.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Role code '${dto.code}' already exists`);

    return this.prisma.t_mtr_roles.create({
      data: {
        code: dto.code,
        name: dto.name,
        name_en: dto.name_en,
        description: dto.description,
        sort_order: dto.sort_order ?? 0,
        is_system: false, // user-created roles are never system
        is_active: true,
        created_by: actorId,
      },
    });
  }

  async updateRole(code: string, dto: UpdateRoleDto, actorId: string) {
    const existing = await this.getRole(code);

    // System roles: restrict what can be changed (cannot deactivate, only metadata)
    if (existing.is_system && dto.is_active === false) {
      throw new BadRequestException(`Cannot deactivate system role '${code}'`);
    }

    const updated = await this.prisma.t_mtr_roles.update({
      where: { code },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.name_en !== undefined && { name_en: dto.name_en }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        ...(dto.sort_order !== undefined && { sort_order: dto.sort_order }),
        updated_by: actorId,
      },
    });

    await this.invalidateSidebarCache(code);
    return updated;
  }

  async deleteRole(code: string, actorId: string) {
    const role = await this.getRole(code);
    if (role.is_system) {
      throw new ConflictException(`Cannot delete system role '${code}'`);
    }
    const userCount = await this.prisma.t_mtr_users.count({ where: { role_code: code } });
    if (userCount > 0) {
      throw new ConflictException(
        `Cannot delete role '${code}' — ${userCount} user(s) still assigned`,
      );
    }

    // Soft delete: cascade to permissions
    const [updatedRole, permResult] = await this.prisma.$transaction([
      this.prisma.t_mtr_roles.update({
        where: { code },
        data: { is_active: false, updated_by: actorId },
      }),
      this.prisma.t_mtr_role_menu_permissions.updateMany({
        where: { role_code: code },
        data: { is_active: false },
      }),
    ]);

    await this.invalidateSidebarCache(code);
    return {
      code: updatedRole.code,
      is_active: updatedRole.is_active,
      cascadedPermissions: permResult.count,
    };
  }

  // ============================================================
  // MENUS
  // ============================================================

  async listMenus(filters: { is_active?: boolean } = {}) {
    const where: Prisma.t_mtr_menusWhereInput = {};
    if (typeof filters.is_active === 'boolean') where.is_active = filters.is_active;

    return this.prisma.t_mtr_menus.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async getMenu(code: string) {
    const menu = await this.prisma.t_mtr_menus.findUnique({ where: { code } });
    if (!menu) throw new NotFoundException(`Menu with code '${code}' not found`);
    return menu;
  }

  async createMenu(dto: CreateMenuDto, actorId: string) {
    if (dto.parent_code) {
      await this.getMenu(dto.parent_code); // exists check
      await this.assertNoCycle(dto.code, dto.parent_code);
    }

    const existing = await this.prisma.t_mtr_menus.findUnique({ where: { code: dto.code } });
    if (existing) {
      if (existing.is_active) {
        throw new ConflictException(`Menu code '${dto.code}' already exists.`);
      }
      // Resurrect inactive menu
      return this.prisma.t_mtr_menus.update({
        where: { code: dto.code },
        data: {
          name: dto.name,
          name_en: dto.name_en,
          parent_code: dto.parent_code ?? null,
          icon: dto.icon,
          slug: dto.slug,
          order: dto.order ?? 0,
          is_new_tab: dto.is_new_tab ?? false,
          is_active: true,
          updated_by: actorId,
        },
      });
    }

    return this.prisma.t_mtr_menus.create({
      data: {
        code: dto.code,
        name: dto.name,
        name_en: dto.name_en,
        parent_code: dto.parent_code ?? null,
        icon: dto.icon,
        slug: dto.slug,
        order: dto.order ?? 0,
        is_new_tab: dto.is_new_tab ?? false,
        is_active: true,
        created_by: actorId,
      },
    });
  }

  async updateMenu(code: string, dto: UpdateMenuDto, actorId: string) {
    const existing = await this.getMenu(code);

    if (dto.parent_code !== undefined && dto.parent_code !== existing.parent_code) {
      if (dto.parent_code) {
        await this.getMenu(dto.parent_code);
        if (dto.parent_code === code) {
          throw new BadRequestException('Menu cannot be its own parent');
        }
        await this.assertNoCycle(code, dto.parent_code);
      }
    }

    const updated = await this.prisma.t_mtr_menus.update({
      where: { code },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.name_en !== undefined && { name_en: dto.name_en }),
        ...(dto.parent_code !== undefined && { parent_code: dto.parent_code }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.is_new_tab !== undefined && { is_new_tab: dto.is_new_tab }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        updated_by: actorId,
      },
    });

    await this.invalidateSidebarCache();
    return updated;
  }

  async deleteMenu(code: string, actorId: string) {
    await this.getMenu(code);

    // Find all descendant menus (recursive)
    const descendants = await this.collectDescendants(code);

    const [updatedMenu, childResult, permResult] = await this.prisma.$transaction([
      this.prisma.t_mtr_menus.update({
        where: { code },
        data: { is_active: false, updated_by: actorId },
      }),
      this.prisma.t_mtr_menus.updateMany({
        where: { code: { in: descendants } },
        data: { is_active: false },
      }),
      this.prisma.t_mtr_role_menu_permissions.updateMany({
        where: { menu_code: { in: [code, ...descendants] } },
        data: { is_active: false },
      }),
    ]);

    await this.invalidateSidebarCache();
    return {
      code: updatedMenu.code,
      is_active: updatedMenu.is_active,
      cascadedMenus: childResult.count,
    };
  }

  /**
   * Walk down the tree from `rootCode` and collect all descendant codes.
   */
  private async collectDescendants(rootCode: string): Promise<string[]> {
    const result: string[] = [];
    const queue = [rootCode];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = await this.prisma.t_mtr_menus.findMany({
        where: { parent_code: current },
        select: { code: true },
      });
      for (const c of children) {
        result.push(c.code);
        queue.push(c.code);
      }
    }
    return result;
  }

  /**
   * Walk up from `childCode`'s prospective parent to ensure no cycle.
   * (Detects A→B→A loops.)
   */
  private async assertNoCycle(childCode: string, proposedParentCode: string): Promise<void> {
    const seen = new Set<string>([childCode]);
    let current: string | null = proposedParentCode;
    let depth = 0;
    while (current && depth < 100) {
      if (seen.has(current)) {
        throw new BadRequestException(
          `Circular parent reference detected: ${childCode} → ${proposedParentCode}`,
        );
      }
      seen.add(current);
      const node = await this.prisma.t_mtr_menus.findUnique({
        where: { code: current },
        select: { parent_code: true },
      });
      current = node?.parent_code ?? null;
      depth++;
    }
  }

  // ============================================================
  // PERMISSIONS
  // ============================================================

  async getPermissionMatrix(filters: { role_code?: string; menu_code?: string } = {}) {
    const where: Prisma.t_mtr_role_menu_permissionsWhereInput = { is_active: true };
    if (filters.role_code) where.role_code = filters.role_code;
    if (filters.menu_code) where.menu_code = filters.menu_code;

    return this.prisma.t_mtr_role_menu_permissions.findMany({
      where,
      orderBy: [{ role_code: 'asc' }, { menu: { order: 'asc' } }],
      include: { menu: { select: { name: true, code: true } } },
    });
  }

  async getRolePermissions(role_code: string) {
    await this.getRole(role_code);
    return this.prisma.t_mtr_role_menu_permissions.findMany({
      where: { role_code },
      include: { menu: { select: { name: true, code: true } } },
      orderBy: { menu: { order: 'asc' } },
    });
  }

  /**
   * Full replacement of permission matrix for one role.
   * Atomic transaction — either all cells written or none.
   */
  async replaceRolePermissions(role_code: string, dto: ReplacePermissionsDto, actorId: string) {
    await this.getRole(role_code);

    // Validate all menuCodes exist & are active
    const requestedCodes = dto.permissions.map((p) => p.menu_code);
    const existingMenus = await this.prisma.t_mtr_menus.findMany({
      where: { code: { in: requestedCodes }, is_active: true },
      select: { code: true },
    });
    const existingCodes = new Set(existingMenus.map((m) => m.code));
    const invalid = requestedCodes.filter((c) => !existingCodes.has(c));
    if (invalid.length > 0) {
      throw new BadRequestException(`Unknown or inactive menuCodes: ${invalid.join(', ')}`);
    }

    // Build full list of all active menu codes for this role
    const allActiveMenus = await this.prisma.t_mtr_menus.findMany({
      where: { is_active: true },
      select: { code: true },
    });
    const allCodes = new Set(allActiveMenus.map((m) => m.code));

    // Build desired permission map
    const desired = new Map<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>();
    for (const cell of dto.permissions) {
      desired.set(cell.menu_code, {
        can_view: cell.can_view ?? false,
        can_create: cell.can_create ?? false,
        can_edit: cell.can_edit ?? false,
        can_delete: cell.can_delete ?? false,
      });
    }

    // Perform upsert in transaction
    await this.prisma.$transaction(async (tx) => {
      for (const menu_code of allCodes) {
        const want = desired.get(menu_code) ?? {
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        };
        await tx.t_mtr_role_menu_permissions.upsert({
          where: { role_code_menu_code: { role_code, menu_code } },
          update: { ...want, is_active: true, updated_by: actorId },
          create: { role_code, menu_code, ...want, is_active: true, created_by: actorId },
        });
      }
    });

    await this.invalidateSidebarCache(role_code);
    return {
      role_code,
      updated: allCodes.size,
      cacheInvalidated: true,
    };
  }

  // ============================================================
  // USER ROLE ASSIGNMENT
  // ============================================================

  async getUserRole(user_id: string) {
    const user = await this.prisma.t_mtr_users.findUnique({
      where: { id: user_id },
      include: { role: true },
    });
    if (!user) throw new NotFoundException(`User '${user_id}' not found`);
    return { user_id: user.id, role_code: user.role_code, role: user.role };
  }

  async assignUserRole(user_id: string, role_code: string, actorId: string) {
    const role = await this.getRole(role_code);
    if (!role.is_active) {
      throw new ConflictException(`Cannot assign inactive role '${role_code}'`);
    }

    const user = await this.prisma.t_mtr_users.findUnique({ where: { id: user_id } });
    if (!user) throw new NotFoundException(`User '${user_id}' not found`);

    // Safeguard: cannot demote the last active ADMIN
    if (user.role_code === 'ADMIN' && role_code !== 'ADMIN') {
      const adminCount = await this.prisma.t_mtr_users.count({ where: { role_code: 'ADMIN' } });
      if (adminCount <= 1) {
        throw new ConflictException('Cannot demote the last active ADMIN — system lockout prevention');
      }
    }

    const updated = await this.prisma.t_mtr_users.update({
      where: { id: user_id },
      data: { role_code },
    });

    return { user_id: updated.id, role_code: updated.role_code };
  }

  // ============================================================
  // PERMISSION CHECK (for guards)
  // ============================================================

  /**
   * Check if a role has a specific permission on a menu.
   * Uses a short Redis cache (30s) to avoid hammering the DB.
   */
  async hasPermission(
    role_code: string,
    menu_code: string,
    action: 'view' | 'create' | 'edit' | 'delete',
  ): Promise<boolean> {
    const fieldMap = {
      view: 'can_view',
      create: 'can_create',
      edit: 'can_edit',
      delete: 'can_delete',
    } as const;

    const perm = await this.prisma.t_mtr_role_menu_permissions.findFirst({
      where: {
        role_code,
        menu_code,
        is_active: true,
        menu: { is_active: true },
      },
      select: { [fieldMap[action]]: true },
    });

    return !!perm?.[fieldMap[action]];
  }

  /**
   * Check if a role has ANY of the listed permissions.
   */
  async hasAnyPermission(
    role_code: string,
    checks: Array<{ menu_code: string; action: 'view' | 'create' | 'edit' | 'delete' }>,
  ): Promise<boolean> {
    for (const check of checks) {
      if (await this.hasPermission(role_code, check.menu_code, check.action)) {
        return true;
      }
    }
    return false;
  }
}
