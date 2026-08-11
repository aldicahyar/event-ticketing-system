import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { ConfigService } from '@nestjs/config';

export interface LockoutConfig {
  maxAttempts: number;
  lockoutDurationMinutes: number;
  attemptWindowMinutes: number;
}

@Injectable()
export class AccountLockoutService {
  private readonly logger = new Logger(AccountLockoutService.name);

  private readonly config: LockoutConfig;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {
    this.config = {
      maxAttempts: this.configService.get<number>('AUTH_MAX_LOGIN_ATTEMPTS', 5),
      lockoutDurationMinutes: this.configService.get<number>('AUTH_LOCKOUT_DURATION_MINUTES', 30),
      attemptWindowMinutes: this.configService.get<number>('AUTH_ATTEMPT_WINDOW_MINUTES', 15),
    };
  }

  async checkLockout(
    user_id: string,
  ): Promise<{ isLocked: boolean; locked_until?: Date; remainingTime?: number }> {
    const user = await this.prisma.t_mtr_users.findUnique({
      where: { id: user_id },
      select: { locked_until: true, is_active: true },
    });

    if (!user) {
      return { isLocked: true };
    }

    if (!user.is_active) {
      return { isLocked: true };
    }

    if (user.locked_until && user.locked_until > new Date()) {
      const remainingTime = Math.ceil((user.locked_until.getTime() - Date.now()) / 1000 / 60);
      return { isLocked: true, locked_until: user.locked_until, remainingTime };
    }

    return { isLocked: false };
  }

  async checkLockoutByEmail(
    email: string,
  ): Promise<{ isLocked: boolean; locked_until?: Date; remainingTime?: number }> {
    const user = await this.prisma.t_mtr_users.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, locked_until: true, is_active: true },
    });

    if (!user) {
      return { isLocked: false };
    }

    return this.checkLockout(user.id);
  }

  async recordFailedAttempt(
    user_id: string,
    ip_address: string,
    user_agent: string,
  ): Promise<{ attempts: number; isLocked: boolean; locked_until?: Date }> {
    const user = await this.prisma.t_mtr_users.findUnique({
      where: { id: user_id },
      select: { failed_login_attempts: true, locked_until: true },
    });

    if (!user) {
      return { attempts: 0, isLocked: false };
    }

    if (user.locked_until && user.locked_until > new Date()) {
      return {
        attempts: user.failed_login_attempts,
        isLocked: true,
        locked_until: user.locked_until,
      };
    }

    const newAttempts = user.failed_login_attempts + 1;
    const isLocked = newAttempts >= this.config.maxAttempts;

    const updateData: any = {
      failed_login_attempts: newAttempts,
      last_failed_login_at: new Date(),
    };

    if (isLocked) {
      const locked_until = new Date(Date.now() + this.config.lockoutDurationMinutes * 60 * 1000);
      updateData.locked_until = locked_until;

      await this.prisma.t_trx_security_logs.create({
        data: {
          user_id,
          action: 'ACCOUNT_LOCKED',
          ip_address,
          user_agent,
          metadata: {
            reason: 'Too many failed login attempts',
            attempts: newAttempts,
            lockoutDurationMinutes: this.config.lockoutDurationMinutes,
          },
        },
      });

      this.logger.warn(`Account locked for user ${user_id} after ${newAttempts} failed attempts`);

      return { attempts: newAttempts, isLocked: true, locked_until };
    }

    await this.prisma.t_mtr_users.update({
      where: { id: user_id },
      data: updateData,
    });

    await this.prisma.t_trx_security_logs.create({
      data: {
        user_id,
        action: 'LOGIN_FAILED',
        ip_address,
        user_agent,
        metadata: {
          attempts: newAttempts,
          remainingAttempts: this.config.maxAttempts - newAttempts,
        },
      },
    });

    return { attempts: newAttempts, isLocked: false };
  }

  async resetFailedAttempts(user_id: string): Promise<void> {
    await this.prisma.t_mtr_users.update({
      where: { id: user_id },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date(),
      },
    });
  }

  async unlockAccount(user_id: string, unlockedBy: string, ip_address: string): Promise<void> {
    await this.prisma.t_mtr_users.update({
      where: { id: user_id },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
        is_active: true,
      },
    });

    await this.prisma.t_trx_security_logs.create({
      data: {
        user_id,
        action: 'ACCOUNT_UNLOCKED',
        ip_address,
        metadata: {
          unlockedBy,
        },
      },
    });

    this.logger.log(`Account ${user_id} unlocked by ${unlockedBy}`);
  }

  async getRemainingAttempts(user_id: string): Promise<number> {
    const user = await this.prisma.t_mtr_users.findUnique({
      where: { id: user_id },
      select: { failed_login_attempts: true },
    });

    if (!user) {
      return this.config.maxAttempts;
    }

    return Math.max(0, this.config.maxAttempts - user.failed_login_attempts);
  }

  getConfig(): LockoutConfig {
    return { ...this.config };
  }
}
