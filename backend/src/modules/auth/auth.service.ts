import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AccountLockoutService } from './account-lockout.service';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto/auth.dto';

const enum OtpConfig {
  TTL_SECONDS = 15 * 60,
  COOLDOWN_SECONDS = 60,
  MAX_ATTEMPTS = 5,
  CODE_LENGTH = 6,
}

const enum OtpRedisKeys {
  VERIFY_PREFIX = 'otp:verify:',
  ATTEMPTS_PREFIX = 'otp:attempts:',
  COOLDOWN_PREFIX = 'otp:cooldown:',
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly JWT_ACCESS_EXPIRATION = '15m';
  private readonly JWT_REFRESH_EXPIRATION = '7d';

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private lockoutService: AccountLockoutService,
  ) {}

  async register(dto: RegisterDto, ip_address: string, user_agent: string) {
    // Normalize email to lowercase
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check password confirmation
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Pre-flight: ensure Redis is available BEFORE creating the user record
    // to prevent orphan users (user created in DB but no OTP stored in Redis).
    if (!this.redisService.isAvailable()) {
      this.logger.error('Redis unavailable at registration pre-flight check');
      throw new ServiceUnavailableException(
        'Registration service is temporarily unavailable. Please try again later.',
      );
    }

    const existingUser = await this.prisma.t_mtr_users.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await this.hashPassword(dto.password);

    // Generate OTP code before DB write so we have everything ready
    const verificationCode = this.generateOtpCode();

    const user = await this.prisma.t_mtr_users.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: dto.name.trim(),
        role_code: dto.role || 'ATTENDEE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role_code: true,
        is_active: true,
        email_verified: true,
        created_at: true,
      },
    });

    // Store OTP in Redis — if this fails after user creation, roll back the user record
    try {
      await this.storeVerificationCode(normalizedEmail, verificationCode);
    } catch (error) {
      this.logger.error(
        `Failed to store OTP for ${normalizedEmail}, rolling back user record`,
        error,
      );
      await this.prisma.t_mtr_users.delete({ where: { id: user.id } });
      throw error;
    }

    // Log registration
    await this.prisma.t_trx_security_logs.create({
      data: {
        user_id: user.id,
        action: 'REGISTER',
        ip_address,
        user_agent,
        metadata: { method: 'local' },
      },
    });

    this.logger.log(`User registered: ${user.email}`);
    this.logger.debug(`[Mock Email] Verification code for ${user.email} is: ${verificationCode}`);

    // Log OTP sent event
    await this.prisma.t_trx_security_logs.create({
      data: {
        user_id: user.id,
        action: 'OTP_SENT',
        ip_address,
        metadata: { method: 'register' },
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  async verifyEmail(email: string, token: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.prisma.t_mtr_users.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.email_verified) {
      const userWithoutPassword = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role_code,
        role_code: user.role_code,
        is_active: user.is_active,
        email_verified: user.email_verified,
        created_at: user.created_at,
      };
      const tokens = await this.generateTokens(userWithoutPassword);
      return {
        user: userWithoutPassword,
        ...tokens,
      };
    }

    const storedCode = await this.getVerificationCode(normalizedEmail);
    if (!storedCode) {
      throw new BadRequestException(
        'Verification code expired or not found. Please request a new one.',
      );
    }

    if (storedCode !== token) {
      const attempts = await this.incrAttempts(normalizedEmail);
      if (attempts >= OtpConfig.MAX_ATTEMPTS) {
        await this.deleteVerificationCode(normalizedEmail);

        await this.prisma.t_trx_security_logs.create({
          data: {
            user_id: user.id,
            action: 'OTP_FAILED',
            metadata: { email: normalizedEmail, attempts, reason: 'max_attempts' },
          },
        });

        throw new BadRequestException('Too many invalid attempts. Please request a new code.');
      }

      await this.prisma.t_trx_security_logs.create({
        data: {
          user_id: user.id,
          action: 'OTP_FAILED',
          metadata: { email: normalizedEmail, attempts },
        },
      });

      throw new BadRequestException(
        `Invalid verification code. ${OtpConfig.MAX_ATTEMPTS - attempts} attempt${OtpConfig.MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining.`,
      );
    }

    // Code is valid! Clean up from Redis
    await this.deleteVerificationCode(normalizedEmail);

    // Update user in DB
    const updatedUser = await this.prisma.t_mtr_users.update({
      where: { email: normalizedEmail },
      data: { email_verified: true },
      select: {
        id: true,
        email: true,
        name: true,
        role_code: true,
        is_active: true,
        email_verified: true,
        created_at: true,
      },
    });

    // Log verification
    await this.prisma.t_trx_security_logs.create({
      data: {
        user_id: updatedUser.id,
        action: 'EMAIL_VERIFIED',
        metadata: { method: 'local' },
      },
    });

    this.logger.log(`Email verified for user: ${updatedUser.email}`);

    // Generate tokens so they are logged in directly
    const tokens = await this.generateTokens(updatedUser);

    return {
      user: updatedUser,
      ...tokens,
    };
  }

  async resendVerification(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // Fail fast if Redis is down — cooldown check and OTP storage both need it
    if (!this.redisService.isAvailable()) {
      throw new ServiceUnavailableException(
        'Email verification service unavailable. Please try again.',
      );
    }

    const user = await this.prisma.t_mtr_users.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.email_verified) {
      throw new BadRequestException('Email is already verified');
    }

    // Rate-limit: per-email cooldown to prevent abuse
    const cooldownKey = `${OtpRedisKeys.COOLDOWN_PREFIX}${normalizedEmail}`;
    const isCoolingDown = await this.redisService.exists(cooldownKey);
    if (isCoolingDown) {
      await this.prisma.t_trx_security_logs.create({
        data: {
          user_id: user.id,
          action: 'OTP_RATE_LIMITED',
          metadata: { email: normalizedEmail },
        },
      });
      throw new HttpException(
        'Please wait before requesting a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const verificationCode = this.generateOtpCode();
    await this.storeVerificationCode(normalizedEmail, verificationCode);

    // Set cooldown key with TTL (auto-expires)
    await this.redisService.set(cooldownKey, '1', OtpConfig.COOLDOWN_SECONDS);

    this.logger.debug(
      `[Mock Email] Resent verification code for ${normalizedEmail} is: ${verificationCode}`,
    );

    // Log OTP sent event
    await this.prisma.t_trx_security_logs.create({
      data: {
        user_id: user.id,
        action: 'OTP_SENT',
        metadata: { method: 'resend' },
      },
    });

    return { message: 'Verification code sent successfully' };
  }

  async login(dto: LoginDto, ip_address: string, user_agent: string) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if account is locked before attempting login
    const lockoutStatus = await this.lockoutService.checkLockoutByEmail(normalizedEmail);
    if (lockoutStatus.isLocked) {
      throw new ForbiddenException(
        `Account is temporarily locked. Please try again in ${lockoutStatus.remainingTime} minutes.`,
      );
    }

    const user = await this.prisma.t_mtr_users.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      const result = await this.lockoutService.recordFailedAttempt(user.id, ip_address, user_agent);

      if (result.isLocked) {
        throw new ForbiddenException(
          'Account has been locked due to too many failed attempts. Please try again later.',
        );
      }

      const remaining = await this.lockoutService.getRemainingAttempts(user.id);
      throw new UnauthorizedException(
        `Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lockout.`,
      );
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Reset failed attempts on successful login
    await this.lockoutService.resetFailedAttempts(user.id);

    // Log successful login
    await this.prisma.t_trx_security_logs.create({
      data: {
        user_id: user.id,
        action: 'LOGIN',
        ip_address,
        user_agent,
      },
    });

    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role_code,
      role_code: user.role_code,
      is_active: user.is_active,
      email_verified: user.email_verified,
      created_at: user.created_at,
    };

    const tokens = await this.generateTokens(userWithoutPassword);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Check if token is revoked.
      // NOTE: When Redis is down, exists() returns false — this means a revoked
      // token could be accepted. We log a warning so this is observable but do NOT
      // block the user, since JWT expiration still provides a time-bound safety net.
      if (!this.redisService.isAvailable()) {
        this.logger.warn(
          `Token revocation check skipped (Redis unavailable) for user ${payload.sub}`,
        );
      }
      const isRevoked = await this.redisService.exists(`revoked:${payload.jti}`);
      if (isRevoked) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      // Check if user is locked
      const lockoutStatus = await this.lockoutService.checkLockout(payload.sub);
      if (lockoutStatus.isLocked) {
        throw new ForbiddenException('Account is locked');
      }

      const user = await this.prisma.t_mtr_users.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          is_active: true,
          email_verified: true,
          created_at: true,
        },
      });

      if (!user || !user.is_active) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const tokens = await this.generateTokens(user);

      // Revoke old refresh token
      await this.revokeRefreshToken(refreshToken);

      return {
        user,
        ...tokens,
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string, user_id: string, ip_address: string) {
    try {
      const payload = this.jwtService.decode(refreshToken) as any;

      await this.revokeRefreshToken(refreshToken);

      // Delete all user sessions
      await this.redisService.delPattern(`session:${user_id}:*`);

      // Log logout
      if (payload?.sub) {
        await this.prisma.t_trx_security_logs.create({
          data: {
            user_id: payload.sub,
            action: 'LOGOUT',
            ip_address,
            metadata: { method: 'manual' },
          },
        });
      }

      this.logger.log(`User logged out: ${payload?.email}`);
    } catch (error) {
      this.logger.error('Logout error', error);
    }
  }

  async logoutAllDevices(user_id: string, ip_address: string) {
    // Revoke all refresh tokens by pattern
    await this.redisService.delPattern(`refresh:${user_id}:*`);
    await this.redisService.delPattern(`session:${user_id}:*`);

    // Log logout all
    await this.prisma.t_trx_security_logs.create({
      data: {
        user_id,
        action: 'LOGOUT_ALL',
        ip_address,
        metadata: { method: 'all_devices' },
      },
    });

    this.logger.log(`User logged out from all devices: ${user_id}`);
  }

  async changePassword(
    user_id: string,
    dto: ChangePasswordDto,
    ip_address: string,
    user_agent: string,
  ) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.t_mtr_users.findUnique({
      where: { id: user_id },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is same as old
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const hashedPassword = await this.hashPassword(dto.newPassword);

    await this.prisma.t_mtr_users.update({
      where: { id: user_id },
      data: {
        password: hashedPassword,
        password_changed_at: new Date(),
      },
    });

    // Log password change
    await this.prisma.t_trx_security_logs.create({
      data: {
        user_id,
        action: 'PASSWORD_CHANGE',
        ip_address,
        user_agent,
      },
    });

    // Revoke all refresh tokens to force re-login
    await this.redisService.delPattern(`refresh:${user_id}:*`);

    this.logger.log(`Password changed for user: ${user_id}`);

    return { message: 'Password changed successfully. Please login again.' };
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  private generateOtpCode(): string {
    const min = 10 ** (OtpConfig.CODE_LENGTH - 1);
    const max = 10 ** OtpConfig.CODE_LENGTH;
    return randomInt(min, max).toString();
  }

  private async storeVerificationCode(email: string, code: string): Promise<void> {
    if (!this.redisService.isAvailable()) {
      this.logger.error('Redis unavailable, cannot store verification code');
      throw new ServiceUnavailableException(
        'Email verification service unavailable. Please try again.',
      );
    }
    const codeKey = `${OtpRedisKeys.VERIFY_PREFIX}${email}`;
    const attemptsKey = `${OtpRedisKeys.ATTEMPTS_PREFIX}${email}`;
    await this.redisService.set(codeKey, code, OtpConfig.TTL_SECONDS);
    await this.redisService.set(attemptsKey, '0', OtpConfig.TTL_SECONDS);
  }

  private async getVerificationCode(email: string): Promise<string | null> {
    if (!this.redisService.isAvailable()) {
      throw new ServiceUnavailableException(
        'Email verification service unavailable. Please try again.',
      );
    }
    const codeKey = `${OtpRedisKeys.VERIFY_PREFIX}${email}`;
    const code = await this.redisService.get<any>(codeKey);
    return code !== null ? String(code) : null;
  }

  private async deleteVerificationCode(email: string): Promise<void> {
    if (!this.redisService.isAvailable()) return;
    await this.redisService.del(`${OtpRedisKeys.VERIFY_PREFIX}${email}`);
    await this.redisService.del(`${OtpRedisKeys.ATTEMPTS_PREFIX}${email}`);
  }

  /**
   * Atomically increments the failed-attempt counter via Redis INCR.
   * INCR is a single atomic command, so concurrent requests each receive a
   * unique, strictly-increasing value — MAX_ATTEMPTS cannot be bypassed.
   * INCR preserves the key's existing TTL, so expiration is never reset.
   */
  private async incrAttempts(email: string): Promise<number> {
    if (!this.redisService.isAvailable()) {
      throw new ServiceUnavailableException(
        'Email verification service unavailable. Please try again.',
      );
    }
    const attemptsKey = `${OtpRedisKeys.ATTEMPTS_PREFIX}${email}`;
    return this.redisService.incr(attemptsKey);
  }

  private async generateTokens(user: any) {
    const jti = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.JWT_ACCESS_EXPIRATION,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          jti,
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.JWT_REFRESH_EXPIRATION,
        },
      ),
    ]);

    // Store refresh token reference in Redis
    const refreshTokenTtl = 7 * 24 * 60 * 60; // 7 days
    await this.redisService.set(`refresh:${user.id}:${jti}`, 'active', refreshTokenTtl);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer',
    };
  }

  private async revokeRefreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.decode(refreshToken) as any;
      if (payload && payload.exp && payload.jti) {
        const ttl = payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redisService.set(`revoked:${payload.jti}`, 'true', ttl);
          await this.redisService.del(`refresh:${payload.sub}:${payload.jti}`);
        }
      }
    } catch (error) {
      this.logger.error('Error revoking refresh token', error);
    }
  }

  async validateUser(user_id: string) {
    const user = await this.prisma.t_mtr_users.findUnique({
      where: { id: user_id },
      select: {
        id: true,
        email: true,
        name: true,
        role_code: true,
        is_active: true,
        email_verified: true,
      },
    });

    if (!user || !user.is_active) {
      return null;
    }

    // Check if account is locked
    const lockoutStatus = await this.lockoutService.checkLockout(user_id);
    if (lockoutStatus.isLocked) {
      return null;
    }

    return user;
  }

  // Admin: Get security logs for a user
  async getSecurityLogs(user_id: string, limit: number = 50) {
    return this.prisma.t_trx_security_logs.findMany({
      where: { user_id },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  // t_mtr_users: update own profile (currently supports name, phone, date_of_birth, gender)
  async updateProfile(user_id: string, updates: { name?: string, phone?: string, date_of_birth?: string, gender?: string }) {
    const data: { name?: string } = {};
    if (typeof updates.name === 'string' && updates.name.trim().length >= 2) {
      data.name = updates.name.trim();
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.t_mtr_users.update({
        where: { id: user_id },
        data,
      });
    }

    const profileData: any = {};
    if (updates.phone !== undefined) profileData.phone = updates.phone;
    if (updates.gender !== undefined) profileData.gender = updates.gender;
    if (updates.date_of_birth !== undefined) profileData.date_of_birth = updates.date_of_birth ? new Date(updates.date_of_birth) : null;

    if (Object.keys(profileData).length > 0) {
      await this.prisma.t_mtr_user_profiles.upsert({
        where: { user_id },
        update: profileData,
        create: {
          user_id,
          ...profileData,
        },
      });
    }

    const updated = await this.prisma.t_mtr_users.findUnique({
      where: { id: user_id },
      select: {
        id: true,
        email: true,
        name: true,
        role_code: true,
        is_active: true,
        email_verified: true,
        created_at: true,
        profile: true,
      },
    });

    return updated;
  }

  // Admin: Unlock user account
  async adminUnlockAccount(targetUserId: string, adminId: string, ip_address: string) {
    await this.lockoutService.unlockAccount(targetUserId, adminId, ip_address);
    return { message: 'Account unlocked successfully' };
  }
}
