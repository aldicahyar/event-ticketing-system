import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  ListUsersQueryDto,
  CreateUserDto,
  UpdateUserDto,
} from './dto/user-admin.dto';

const SALT_ROUNDS = 12;

/**
 * Shape returned to the admin UI. `password` is never selected.
 */
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  roleCode: true,
  provider: true,
  avatar: true,
  isActive: true,
  emailVerified: true,
  failedLoginAttempts: true,
  lockedUntil: true,
  lastLoginAt: true,
  lastFailedLoginAt: true,
  passwordChangedAt: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { code: true, name: true, isActive: true, isSystem: true } },
  _count: { select: { bookings: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ============================================================
  // READ
  // ============================================================

  /**
   * Paginated user list for the admin monitoring table.
   * Returns `{ items, meta }` so the UI can render pagination controls.
   */
  async listUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where = this.buildWhere(query);
    const orderBy: Prisma.UserOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder } as Prisma.UserOrderByWithRelationInput,
      { id: 'asc' },
    ];

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const now = new Date();
    return {
      items: items.map((u) => ({
        ...u,
        isLocked: !!u.lockedUntil && u.lockedUntil > now,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Aggregate counters for the monitoring stat cards.
   *
   * Per-role counts come from Role (not user.groupBy) so roles with zero users
   * still show up, and so we avoid Prisma's groupBy typings, which need
   * `strictNullChecks` — this project compiles with it off.
   */
  async getStats() {
    const now = new Date();
    const [total, active, inactive, unverified, locked, roles] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { isActive: false } }),
        this.prisma.user.count({ where: { emailVerified: false } }),
        this.prisma.user.count({ where: { lockedUntil: { gt: now } } }),
        this.prisma.role.findMany({
          where: { isActive: true },
          select: { code: true, _count: { select: { users: true } } },
          orderBy: { sortOrder: 'asc' },
        }),
      ]);

    return {
      total,
      active,
      inactive,
      unverified,
      locked,
      byRole: roles
        .map((r) => ({ roleCode: r.code, count: r._count.users }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException(`User '${id}' not found`);
    return {
      ...user,
      isLocked: !!user.lockedUntil && user.lockedUntil > new Date(),
    };
  }

  // ============================================================
  // WRITE
  // ============================================================

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException(`Email '${email}' is already registered`);
    }

    await this.assertRoleAssignable(dto.roleCode);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        password: await bcrypt.hash(dto.password, SALT_ROUNDS),
        roleCode: dto.roleCode,
        provider: 'local',
        isActive: dto.isActive ?? true,
        emailVerified: dto.emailVerified ?? true,
        passwordChangedAt: new Date(),
      },
      select: USER_SELECT,
    });

    this.logger.log(`Admin created user ${user.id} (${user.email}) as ${user.roleCode}`);
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, actorId: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException(`User '${id}' not found`);

    // Unchecked variant so we can set the `roleCode` FK scalar directly
    // instead of going through a nested `role: { connect: ... }`.
    const data: Prisma.UserUncheckedUpdateInput = {};

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email !== target.email) {
        const clash = await this.prisma.user.findUnique({ where: { email } });
        if (clash) throw new ConflictException(`Email '${email}' is already registered`);
        data.email = email;
      }
    }

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.emailVerified !== undefined) data.emailVerified = dto.emailVerified;

    if (dto.roleCode !== undefined && dto.roleCode !== target.roleCode) {
      await this.assertRoleAssignable(dto.roleCode);
      if (target.roleCode === 'ADMIN') {
        if (id === actorId) {
          throw new BadRequestException('You cannot change your own admin role');
        }
        await this.assertNotLastAdmin(id, 'demote');
      }
      data.roleCode = dto.roleCode;
    }

    let deactivated = false;
    if (dto.isActive !== undefined && dto.isActive !== target.isActive) {
      if (dto.isActive === false) {
        if (id === actorId) {
          throw new BadRequestException('You cannot deactivate your own account');
        }
        if (target.roleCode === 'ADMIN') {
          await this.assertNotLastAdmin(id, 'deactivate');
        }
        deactivated = true;
      }
      data.isActive = dto.isActive;
    }

    if (Object.keys(data).length === 0) {
      return this.getUser(id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });

    // A deactivated or re-roled user must not keep an active session.
    if (deactivated || data.roleCode !== undefined) {
      await this.revokeSessions(id);
    }

    this.logger.log(`Admin ${actorId} updated user ${id}: ${Object.keys(data).join(', ')}`);
    return updated;
  }

  /**
   * Hard delete. Refuses when the user still owns bookings — Booking.userId has
   * no cascade, so the delete would fail at the DB level anyway. In that case the
   * admin should deactivate instead, which preserves order history.
   */
  async deleteUser(id: string, actorId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, roleCode: true, _count: { select: { bookings: true } } },
    });
    if (!target) throw new NotFoundException(`User '${id}' not found`);

    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    if (target.roleCode === 'ADMIN') {
      await this.assertNotLastAdmin(id, 'delete');
    }
    if (target._count.bookings > 0) {
      throw new ConflictException(
        `Cannot delete '${target.email}' — ${target._count.bookings} booking(s) attached. ` +
          'Deactivate the account instead to preserve order history.',
      );
    }

    await this.prisma.user.delete({ where: { id } });
    await this.revokeSessions(id);

    this.logger.warn(`Admin ${actorId} deleted user ${id} (${target.email})`);
    return { id, email: target.email, deleted: true };
  }

  /** Clear a lockout produced by repeated failed logins. */
  async unlockUser(id: string, actorId: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException(`User '${id}' not found`);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { lockedUntil: null, failedLoginAttempts: 0 },
      select: USER_SELECT,
    });

    this.logger.log(`Admin ${actorId} unlocked user ${id}`);
    return { ...updated, isLocked: false };
  }

  /** Force a new password and drop every existing session. */
  async resetPassword(id: string, newPassword: string, actorId: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException(`User '${id}' not found`);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: await bcrypt.hash(newPassword, SALT_ROUNDS),
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.revokeSessions(id);

    this.logger.warn(`Admin ${actorId} reset password for user ${id}`);
    return { id, passwordReset: true, sessionsRevoked: true };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Filters are combined with AND so the free-text OR block never collides
   * with the lock-state OR block.
   */
  private buildWhere(query: ListUsersQueryDto): Prisma.UserWhereInput {
    const and: Prisma.UserWhereInput[] = [];

    const search = query.search?.trim();
    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (query.roleCode) and.push({ roleCode: query.roleCode });
    if (typeof query.isActive === 'boolean') and.push({ isActive: query.isActive });
    if (typeof query.emailVerified === 'boolean') {
      and.push({ emailVerified: query.emailVerified });
    }
    if (query.provider) and.push({ provider: query.provider });

    if (typeof query.locked === 'boolean') {
      const now = new Date();
      and.push(
        query.locked
          ? { lockedUntil: { gt: now } }
          : // `not: { gt: now }` would drop rows where lockedUntil IS NULL,
            // i.e. every account that was never locked. Spell it out instead.
            { OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] },
      );
    }

    return and.length > 0 ? { AND: and } : {};
  }

  private async assertRoleAssignable(roleCode: string) {
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new BadRequestException(`Role '${roleCode}' does not exist`);
    if (!role.isActive) {
      throw new ConflictException(`Cannot assign inactive role '${roleCode}'`);
    }
  }

  /**
   * Lockout prevention: refuse the operation when `id` is the only remaining
   * ADMIN that is still active.
   */
  private async assertNotLastAdmin(id: string, action: string) {
    const otherAdmins = await this.prisma.user.count({
      where: { roleCode: 'ADMIN', isActive: true, id: { not: id } },
    });
    if (otherAdmins === 0) {
      throw new ConflictException(
        `Cannot ${action} the last active ADMIN — system lockout prevention`,
      );
    }
  }

  /** Best-effort revoke of stored refresh tokens for a user. */
  private async revokeSessions(userId: string) {
    try {
      await this.redis.delPattern(`refresh:${userId}:*`);
    } catch (e) {
      this.logger.warn(`Failed to revoke sessions for ${userId}: ${(e as Error).message}`);
    }
  }
}
