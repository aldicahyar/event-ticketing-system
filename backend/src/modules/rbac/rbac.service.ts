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
   * Get flat list of menus visible to the user (canView=true).
   * Cache per roleCode in Redis for 5 minutes.
   */
  async getMySidebar(roleCode: string) {
    const cacheKey = `${this.SIDEBAR_CACHE_PREFIX}${roleCode}`;
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.roleMenuPermission.findMany({
      where: {
        roleCode,
        canView: true,
        isActive: true,
        menu: { isActive: true },
      },
      include: {
        menu: {
          select: {
            code: true,
            name: true,
            nameEn: true,
            parentCode: true,
            icon: true,
            slug: true,
            order: true,
            isNewTab: true,
          },
        },
      },
      orderBy: { menu: { order: 'asc' } },
    });

    const result = rows.map((r) => ({
      ...r.menu,
      permissions: {
        canView: r.canView,
        canCreate: r.canCreate,
        canEdit: r.canEdit,
        canDelete: r.canDelete,
      },
    }));

    await this.redis.set(cacheKey, result, this.SIDEBAR_CACHE_TTL_SEC);
    return result;
  }

  /** Invalidate sidebar cache for one role (or all roles with '*'). */
  async invalidateSidebarCache(roleCode?: string) {
    try {
      if (roleCode) {
        await this.redis.del(`${this.SIDEBAR_CACHE_PREFIX}${roleCode}`);
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

  async listRoles(filters: { isActive?: boolean; includePermissions?: boolean } = {}) {
    const where: Prisma.RoleWhereInput = {};
    if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;

    return this.prisma.role.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: filters.includePermissions
        ? { _count: { select: { permissions: true, users: true } } }
        : { _count: { select: { users: true } } },
    });
  }

  async getRole(code: string) {
    const role = await this.prisma.role.findUnique({ where: { code } });
    if (!role) throw new NotFoundException(`Role with code '${code}' not found`);
    return role;
  }

  async createRole(dto: CreateRoleDto, actorId: string) {
    const existing = await this.prisma.role.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Role code '${dto.code}' already exists`);

    return this.prisma.role.create({
      data: {
        code: dto.code,
        name: dto.name,
        nameEn: dto.nameEn,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        isSystem: false, // user-created roles are never system
        isActive: true,
        createdBy: actorId,
      },
    });
  }

  async updateRole(code: string, dto: UpdateRoleDto, actorId: string) {
    const existing = await this.getRole(code);

    // System roles: restrict what can be changed (cannot deactivate, only metadata)
    if (existing.isSystem && dto.isActive === false) {
      throw new BadRequestException(`Cannot deactivate system role '${code}'`);
    }

    const updated = await this.prisma.role.update({
      where: { code },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        updatedBy: actorId,
      },
    });

    await this.invalidateSidebarCache(code);
    return updated;
  }

  async deleteRole(code: string, actorId: string) {
    const role = await this.getRole(code);
    if (role.isSystem) {
      throw new ConflictException(`Cannot delete system role '${code}'`);
    }
    const userCount = await this.prisma.user.count({ where: { roleCode: code } });
    if (userCount > 0) {
      throw new ConflictException(
        `Cannot delete role '${code}' — ${userCount} user(s) still assigned`,
      );
    }

    // Soft delete: cascade to permissions
    const [updatedRole, permResult] = await this.prisma.$transaction([
      this.prisma.role.update({
        where: { code },
        data: { isActive: false, updatedBy: actorId },
      }),
      this.prisma.roleMenuPermission.updateMany({
        where: { roleCode: code },
        data: { isActive: false },
      }),
    ]);

    await this.invalidateSidebarCache(code);
    return {
      code: updatedRole.code,
      isActive: updatedRole.isActive,
      cascadedPermissions: permResult.count,
    };
  }

  // ============================================================
  // MENUS
  // ============================================================

  async listMenus(filters: { isActive?: boolean } = {}) {
    const where: Prisma.MenuWhereInput = {};
    if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;

    return this.prisma.menu.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async getMenu(code: string) {
    const menu = await this.prisma.menu.findUnique({ where: { code } });
    if (!menu) throw new NotFoundException(`Menu with code '${code}' not found`);
    return menu;
  }

  async createMenu(dto: CreateMenuDto, actorId: string) {
    if (dto.parentCode) {
      await this.getMenu(dto.parentCode); // exists check
      await this.assertNoCycle(dto.code, dto.parentCode);
    }

    return this.prisma.menu.create({
      data: {
        code: dto.code,
        name: dto.name,
        nameEn: dto.nameEn,
        parentCode: dto.parentCode ?? null,
        icon: dto.icon,
        slug: dto.slug,
        order: dto.order ?? 0,
        isNewTab: dto.isNewTab ?? false,
        isActive: true,
        createdBy: actorId,
      },
    });
  }

  async updateMenu(code: string, dto: UpdateMenuDto, actorId: string) {
    const existing = await this.getMenu(code);

    if (dto.parentCode !== undefined && dto.parentCode !== existing.parentCode) {
      if (dto.parentCode) {
        await this.getMenu(dto.parentCode);
        if (dto.parentCode === code) {
          throw new BadRequestException('Menu cannot be its own parent');
        }
        await this.assertNoCycle(code, dto.parentCode);
      }
    }

    const updated = await this.prisma.menu.update({
      where: { code },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
        ...(dto.parentCode !== undefined && { parentCode: dto.parentCode }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.isNewTab !== undefined && { isNewTab: dto.isNewTab }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedBy: actorId,
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
      this.prisma.menu.update({
        where: { code },
        data: { isActive: false, updatedBy: actorId },
      }),
      this.prisma.menu.updateMany({
        where: { code: { in: descendants } },
        data: { isActive: false },
      }),
      this.prisma.roleMenuPermission.updateMany({
        where: { menuCode: { in: [code, ...descendants] } },
        data: { isActive: false },
      }),
    ]);

    await this.invalidateSidebarCache();
    return {
      code: updatedMenu.code,
      isActive: updatedMenu.isActive,
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
      const children = await this.prisma.menu.findMany({
        where: { parentCode: current },
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
      const node = await this.prisma.menu.findUnique({
        where: { code: current },
        select: { parentCode: true },
      });
      current = node?.parentCode ?? null;
      depth++;
    }
  }

  // ============================================================
  // PERMISSIONS
  // ============================================================

  async getPermissionMatrix(filters: { roleCode?: string; menuCode?: string } = {}) {
    const where: Prisma.RoleMenuPermissionWhereInput = { isActive: true };
    if (filters.roleCode) where.roleCode = filters.roleCode;
    if (filters.menuCode) where.menuCode = filters.menuCode;

    return this.prisma.roleMenuPermission.findMany({
      where,
      orderBy: [{ roleCode: 'asc' }, { menu: { order: 'asc' } }],
      include: { menu: { select: { name: true, code: true } } },
    });
  }

  async getRolePermissions(roleCode: string) {
    await this.getRole(roleCode);
    return this.prisma.roleMenuPermission.findMany({
      where: { roleCode },
      include: { menu: { select: { name: true, code: true } } },
      orderBy: { menu: { order: 'asc' } },
    });
  }

  /**
   * Full replacement of permission matrix for one role.
   * Atomic transaction — either all cells written or none.
   */
  async replaceRolePermissions(roleCode: string, dto: ReplacePermissionsDto, actorId: string) {
    await this.getRole(roleCode);

    // Validate all menuCodes exist & are active
    const requestedCodes = dto.permissions.map((p) => p.menuCode);
    const existingMenus = await this.prisma.menu.findMany({
      where: { code: { in: requestedCodes }, isActive: true },
      select: { code: true },
    });
    const existingCodes = new Set(existingMenus.map((m) => m.code));
    const invalid = requestedCodes.filter((c) => !existingCodes.has(c));
    if (invalid.length > 0) {
      throw new BadRequestException(`Unknown or inactive menuCodes: ${invalid.join(', ')}`);
    }

    // Build full list of all active menu codes for this role
    const allActiveMenus = await this.prisma.menu.findMany({
      where: { isActive: true },
      select: { code: true },
    });
    const allCodes = new Set(allActiveMenus.map((m) => m.code));

    // Build desired permission map
    const desired = new Map<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>();
    for (const cell of dto.permissions) {
      desired.set(cell.menuCode, {
        canView: cell.canView ?? false,
        canCreate: cell.canCreate ?? false,
        canEdit: cell.canEdit ?? false,
        canDelete: cell.canDelete ?? false,
      });
    }

    // Perform upsert in transaction
    await this.prisma.$transaction(async (tx) => {
      for (const menuCode of allCodes) {
        const want = desired.get(menuCode) ?? {
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        };
        await tx.roleMenuPermission.upsert({
          where: { roleCode_menuCode: { roleCode, menuCode } },
          update: { ...want, isActive: true, updatedBy: actorId },
          create: { roleCode, menuCode, ...want, isActive: true, createdBy: actorId },
        });
      }
    });

    await this.invalidateSidebarCache(roleCode);
    return {
      roleCode,
      updated: allCodes.size,
      cacheInvalidated: true,
    };
  }

  // ============================================================
  // USER ROLE ASSIGNMENT
  // ============================================================

  async getUserRole(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) throw new NotFoundException(`User '${userId}' not found`);
    return { userId: user.id, roleCode: user.roleCode, role: user.role };
  }

  async assignUserRole(userId: string, roleCode: string, actorId: string) {
    const role = await this.getRole(roleCode);
    if (!role.isActive) {
      throw new ConflictException(`Cannot assign inactive role '${roleCode}'`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User '${userId}' not found`);

    // Safeguard: cannot demote the last active ADMIN
    if (user.roleCode === 'ADMIN' && roleCode !== 'ADMIN') {
      const adminCount = await this.prisma.user.count({ where: { roleCode: 'ADMIN' } });
      if (adminCount <= 1) {
        throw new ConflictException('Cannot demote the last active ADMIN — system lockout prevention');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { roleCode },
    });

    return { userId: updated.id, roleCode: updated.roleCode };
  }

  // ============================================================
  // PERMISSION CHECK (for guards)
  // ============================================================

  /**
   * Check if a role has a specific permission on a menu.
   * Uses a short Redis cache (30s) to avoid hammering the DB.
   */
  async hasPermission(
    roleCode: string,
    menuCode: string,
    action: 'view' | 'create' | 'edit' | 'delete',
  ): Promise<boolean> {
    const fieldMap = {
      view: 'canView',
      create: 'canCreate',
      edit: 'canEdit',
      delete: 'canDelete',
    } as const;

    const perm = await this.prisma.roleMenuPermission.findFirst({
      where: {
        roleCode,
        menuCode,
        isActive: true,
        menu: { isActive: true },
      },
      select: { [fieldMap[action]]: true },
    });

    return !!perm?.[fieldMap[action]];
  }

  /**
   * Check if a role has ANY of the listed permissions.
   */
  async hasAnyPermission(
    roleCode: string,
    checks: Array<{ menuCode: string; action: 'view' | 'create' | 'edit' | 'delete' }>,
  ): Promise<boolean> {
    for (const check of checks) {
      if (await this.hasPermission(roleCode, check.menuCode, check.action)) {
        return true;
      }
    }
    return false;
  }
}
