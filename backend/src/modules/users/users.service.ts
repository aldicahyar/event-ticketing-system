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
import { ListUsersQueryDto, CreateUserDto, UpdateUserDto } from './dto/user-admin.dto';

const SALT_ROUNDS = 12;

/**
 * Shape returned to the admin UI. `password` is never selected.
 */
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role_code: true,
  provider: true,
  avatar: true,
  is_active: true,
  email_verified: true,
  failed_login_attempts: true,
  locked_until: true,
  last_login_at: true,
  last_failed_login_at: true,
  password_changed_at: true,
  created_at: true,
  updated_at: true,
  role: { select: { code: true, name: true, is_active: true, is_system: true } },
  _count: { select: { bookings: true } },
} satisfies Prisma.t_mtr_usersSelect;

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
    const sortBy = query.sortBy ?? 'created_at';
    const sort_order = query.sort_order ?? 'desc';

    const where = this.buildWhere(query);
    const orderBy: Prisma.t_mtr_usersOrderByWithRelationInput[] = [
      { [sortBy]: sort_order } as Prisma.t_mtr_usersOrderByWithRelationInput,
      { id: 'asc' },
    ];

    const [total, items] = await this.prisma.$transaction([
      this.prisma.t_mtr_users.count({ where }),
      this.prisma.t_mtr_users.findMany({
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
        isLocked: !!u.locked_until && u.locked_until > now,
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
   * Per-role counts come from t_mtr_roles (not user.groupBy) so roles with zero users
   * still show up, and so we avoid Prisma's groupBy typings, which need
   * `strictNullChecks` — this project compiles with it off.
   */
  async getStats() {
    const now = new Date();
    const [total, active, inactive, unverified, locked, roles] = await this.prisma.$transaction([
      this.prisma.t_mtr_users.count(),
      this.prisma.t_mtr_users.count({ where: { is_active: true } }),
      this.prisma.t_mtr_users.count({ where: { is_active: false } }),
      this.prisma.t_mtr_users.count({ where: { email_verified: false } }),
      this.prisma.t_mtr_users.count({ where: { locked_until: { gt: now } } }),
      this.prisma.t_mtr_roles.findMany({
        where: { is_active: true },
        select: { code: true, _count: { select: { users: true } } },
        orderBy: { sort_order: 'asc' },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      unverified,
      locked,
      byRole: roles
        .map((r) => ({ role_code: r.code, count: r._count.users }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.t_mtr_users.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException(`User '${id}' not found`);
    return {
      ...user,
      isLocked: !!user.locked_until && user.locked_until > new Date(),
    };
  }

  // ============================================================
  // WRITE
  // ============================================================

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.t_mtr_users.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException(`Email '${email}' is already registered`);
    }

    await this.assertRoleAssignable(dto.role_code);

    const user = await this.prisma.t_mtr_users.create({
      data: {
        email,
        name: dto.name.trim(),
        password: await bcrypt.hash(dto.password, SALT_ROUNDS),
        role_code: dto.role_code,
        provider: 'local',
        is_active: dto.is_active ?? true,
        email_verified: dto.email_verified ?? true,
        password_changed_at: new Date(),
      },
      select: USER_SELECT,
    });

    this.logger.log(`Admin created user ${user.id} (${user.email}) as ${user.role_code}`);
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, actorId: string) {
    const target = await this.prisma.t_mtr_users.findUnique({ where: { id } });
    if (!target) throw new NotFoundException(`User '${id}' not found`);

    // Unchecked variant so we can set the `role_code` FK scalar directly
    // instead of going through a nested `role: { connect: ... }`.
    const data: Prisma.t_mtr_usersUncheckedUpdateInput = {};

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email !== target.email) {
        const clash = await this.prisma.t_mtr_users.findUnique({ where: { email } });
        if (clash) throw new ConflictException(`Email '${email}' is already registered`);
        data.email = email;
      }
    }

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email_verified !== undefined) data.email_verified = dto.email_verified;

    if (dto.role_code !== undefined && dto.role_code !== target.role_code) {
      await this.assertRoleAssignable(dto.role_code);
      if (target.role_code === 'ADMIN') {
        if (id === actorId) {
          throw new BadRequestException('You cannot change your own admin role');
        }
        await this.assertNotLastAdmin(id, 'demote');
      }
      data.role_code = dto.role_code;
    }

    let deactivated = false;
    if (dto.is_active !== undefined && dto.is_active !== target.is_active) {
      if (dto.is_active === false) {
        if (id === actorId) {
          throw new BadRequestException('You cannot deactivate your own account');
        }
        if (target.role_code === 'ADMIN') {
          await this.assertNotLastAdmin(id, 'deactivate');
        }
        deactivated = true;
      }
      data.is_active = dto.is_active;
    }

    if (Object.keys(data).length === 0) {
      return this.getUser(id);
    }

    const updated = await this.prisma.t_mtr_users.update({
      where: { id },
      data,
      select: USER_SELECT,
    });

    // A deactivated or re-roled user must not keep an active session.
    if (deactivated || data.role_code !== undefined) {
      await this.revokeSessions(id);
    }

    this.logger.log(`Admin ${actorId} updated user ${id}: ${Object.keys(data).join(', ')}`);
    return updated;
  }

  /**
   * Hard delete. Refuses when the user still owns bookings — t_trx_bookings.user_id has
   * no cascade, so the delete would fail at the DB level anyway. In that case the
   * admin should deactivate instead, which preserves order history.
   */
  async deleteUser(id: string, actorId: string) {
    const target = await this.prisma.t_mtr_users.findUnique({
      where: { id },
      select: { id: true, email: true, role_code: true, _count: { select: { bookings: true } } },
    });
    if (!target) throw new NotFoundException(`User '${id}' not found`);

    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    if (target.role_code === 'ADMIN') {
      await this.assertNotLastAdmin(id, 'delete');
    }
    if (target._count.bookings > 0) {
      throw new ConflictException(
        `Cannot delete '${target.email}' — ${target._count.bookings} booking(s) attached. ` +
          'Deactivate the account instead to preserve order history.',
      );
    }

    await this.prisma.t_mtr_users.delete({ where: { id } });
    await this.revokeSessions(id);

    this.logger.warn(`Admin ${actorId} deleted user ${id} (${target.email})`);
    return { id, email: target.email, deleted: true };
  }

  /** Clear a lockout produced by repeated failed logins. */
  async unlockUser(id: string, actorId: string) {
    const target = await this.prisma.t_mtr_users.findUnique({ where: { id } });
    if (!target) throw new NotFoundException(`User '${id}' not found`);

    const updated = await this.prisma.t_mtr_users.update({
      where: { id },
      data: { locked_until: null, failed_login_attempts: 0 },
      select: USER_SELECT,
    });

    this.logger.log(`Admin ${actorId} unlocked user ${id}`);
    return { ...updated, isLocked: false };
  }

  /** Force a new password and drop every existing session. */
  async resetPassword(id: string, newPassword: string, actorId: string) {
    const target = await this.prisma.t_mtr_users.findUnique({ where: { id } });
    if (!target) throw new NotFoundException(`User '${id}' not found`);

    await this.prisma.t_mtr_users.update({
      where: { id },
      data: {
        password: await bcrypt.hash(newPassword, SALT_ROUNDS),
        password_changed_at: new Date(),
        failed_login_attempts: 0,
        locked_until: null,
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
  private buildWhere(query: ListUsersQueryDto): Prisma.t_mtr_usersWhereInput {
    const and: Prisma.t_mtr_usersWhereInput[] = [];

    const search = query.search?.trim();
    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (query.role_code) and.push({ role_code: query.role_code });
    if (typeof query.is_active === 'boolean') and.push({ is_active: query.is_active });
    if (typeof query.email_verified === 'boolean') {
      and.push({ email_verified: query.email_verified });
    }
    if (query.provider) and.push({ provider: query.provider });

    if (typeof query.locked === 'boolean') {
      const now = new Date();
      and.push(
        query.locked
          ? { locked_until: { gt: now } }
          : // `not: { gt: now }` would drop rows where locked_until IS NULL,
            // i.e. every account that was never locked. Spell it out instead.
            { OR: [{ locked_until: null }, { locked_until: { lte: now } }] },
      );
    }

    return and.length > 0 ? { AND: and } : {};
  }

  private async assertRoleAssignable(role_code: string) {
    const role = await this.prisma.t_mtr_roles.findUnique({ where: { code: role_code } });
    if (!role) throw new BadRequestException(`Role '${role_code}' does not exist`);
    if (!role.is_active) {
      throw new ConflictException(`Cannot assign inactive role '${role_code}'`);
    }
  }

  /**
   * Lockout prevention: refuse the operation when `id` is the only remaining
   * ADMIN that is still active.
   */
  private async assertNotLastAdmin(id: string, action: string) {
    const otherAdmins = await this.prisma.t_mtr_users.count({
      where: { role_code: 'ADMIN', is_active: true, id: { not: id } },
    });
    if (otherAdmins === 0) {
      throw new ConflictException(
        `Cannot ${action} the last active ADMIN — system lockout prevention`,
      );
    }
  }

  /** Best-effort revoke of stored refresh tokens for a user. */
  private async revokeSessions(user_id: string) {
    try {
      await this.redis.delPattern(`refresh:${user_id}:*`);
    } catch (e) {
      this.logger.warn(`Failed to revoke sessions for ${user_id}: ${(e as Error).message}`);
    }
  }
}
