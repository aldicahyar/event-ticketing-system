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
    userId: string,
  ): Promise<{ isLocked: boolean; lockedUntil?: Date; remainingTime?: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lockedUntil: true, isActive: true },
    });

    if (!user) {
      return { isLocked: true };
    }

    if (!user.isActive) {
      return { isLocked: true };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000 / 60);
      return { isLocked: true, lockedUntil: user.lockedUntil, remainingTime };
    }

    return { isLocked: false };
  }

  async checkLockoutByEmail(
    email: string,
  ): Promise<{ isLocked: boolean; lockedUntil?: Date; remainingTime?: number }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, lockedUntil: true, isActive: true },
    });

    if (!user) {
      return { isLocked: false };
    }

    return this.checkLockout(user.id);
  }

  async recordFailedAttempt(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ attempts: number; isLocked: boolean; lockedUntil?: Date }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginAttempts: true, lockedUntil: true },
    });

    if (!user) {
      return { attempts: 0, isLocked: false };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { attempts: user.failedLoginAttempts, isLocked: true, lockedUntil: user.lockedUntil };
    }

    const newAttempts = user.failedLoginAttempts + 1;
    const isLocked = newAttempts >= this.config.maxAttempts;

    const updateData: any = {
      failedLoginAttempts: newAttempts,
      lastFailedLoginAt: new Date(),
    };

    if (isLocked) {
      const lockedUntil = new Date(Date.now() + this.config.lockoutDurationMinutes * 60 * 1000);
      updateData.lockedUntil = lockedUntil;

      await this.prisma.securityLog.create({
        data: {
          userId,
          action: 'ACCOUNT_LOCKED',
          ipAddress,
          userAgent,
          metadata: {
            reason: 'Too many failed login attempts',
            attempts: newAttempts,
            lockoutDurationMinutes: this.config.lockoutDurationMinutes,
          },
        },
      });

      this.logger.warn(`Account locked for user ${userId} after ${newAttempts} failed attempts`);

      return { attempts: newAttempts, isLocked: true, lockedUntil };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await this.prisma.securityLog.create({
      data: {
        userId,
        action: 'LOGIN_FAILED',
        ipAddress,
        userAgent,
        metadata: {
          attempts: newAttempts,
          remainingAttempts: this.config.maxAttempts - newAttempts,
        },
      },
    });

    return { attempts: newAttempts, isLocked: false };
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
  }

  async unlockAccount(userId: string, unlockedBy: string, ipAddress: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        isActive: true,
      },
    });

    await this.prisma.securityLog.create({
      data: {
        userId,
        action: 'ACCOUNT_UNLOCKED',
        ipAddress,
        metadata: {
          unlockedBy,
        },
      },
    });

    this.logger.log(`Account ${userId} unlocked by ${unlockedBy}`);
  }

  async getRemainingAttempts(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginAttempts: true },
    });

    if (!user) {
      return this.config.maxAttempts;
    }

    return Math.max(0, this.config.maxAttempts - user.failedLoginAttempts);
  }

  getConfig(): LockoutConfig {
    return { ...this.config };
  }
}
