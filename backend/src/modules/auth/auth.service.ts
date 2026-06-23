import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AccountLockoutService } from './account-lockout.service';
import {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly JWT_ACCESS_EXPIRATION = '15m';
  private readonly JWT_REFRESH_EXPIRATION = '7d';
  private readonly verificationCodes = new Map<string, { code: string; expiresAt: Date }>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private lockoutService: AccountLockoutService,
  ) {}

  async register(dto: RegisterDto, ipAddress: string, userAgent: string) {
    // Normalize email to lowercase
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check password confirmation
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: dto.name.trim(),
        role: dto.role || 'ATTENDEE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Log registration
    await this.prisma.securityLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        ipAddress,
        userAgent,
        metadata: { method: 'local' },
      },
    });

    this.logger.log(`User registered: ${user.email}`);

    // Generate email verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    this.verificationCodes.set(normalizedEmail, { code: verificationCode, expiresAt });
    this.logger.log(`[Mock Email] Verification code for ${user.email} is: ${verificationCode}`);

    const tokens = await this.generateTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  async verifyEmail(email: string, token: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      const userWithoutPassword = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      };
      const tokens = await this.generateTokens(userWithoutPassword);
      return {
        user: userWithoutPassword,
        ...tokens,
      };
    }

    const stored = this.verificationCodes.get(normalizedEmail);
    if (!stored) {
      throw new BadRequestException('Verification code expired or not found. Please request a new one.');
    }

    if (stored.expiresAt < new Date()) {
      this.verificationCodes.delete(normalizedEmail);
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    if (stored.code !== token) {
      throw new BadRequestException('Invalid verification code');
    }

    // Code is valid! Clean up code from memory
    this.verificationCodes.delete(normalizedEmail);

    // Update user in DB
    const updatedUser = await this.prisma.user.update({
      where: { email: normalizedEmail },
      data: { emailVerified: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Log verification
    await this.prisma.securityLog.create({
      data: {
        userId: updatedUser.id,
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

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    this.verificationCodes.set(normalizedEmail, { code: verificationCode, expiresAt });

    this.logger.log(`[Mock Email] Resent verification code for ${normalizedEmail} is: ${verificationCode}`);

    return { message: 'Verification code sent successfully' };
  }

  async login(dto: LoginDto, ipAddress: string, userAgent: string) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if account is locked before attempting login
    const lockoutStatus = await this.lockoutService.checkLockoutByEmail(normalizedEmail);
    if (lockoutStatus.isLocked) {
      throw new ForbiddenException(
        `Account is temporarily locked. Please try again in ${lockoutStatus.remainingTime} minutes.`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      const result = await this.lockoutService.recordFailedAttempt(
        user.id,
        ipAddress,
        userAgent,
      );

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

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Reset failed attempts on successful login
    await this.lockoutService.resetFailedAttempts(user.id);

    // Log successful login
    await this.prisma.securityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        ipAddress,
        userAgent,
      },
    });

    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };

    const tokens = await this.generateTokens(userWithoutPassword);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string, ipAddress: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Check if token is revoked
      const isRevoked = await this.redisService.exists(`revoked:${payload.jti}`);
      if (isRevoked) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      // Check if user is locked
      const lockoutStatus = await this.lockoutService.checkLockout(payload.sub);
      if (lockoutStatus.isLocked) {
        throw new ForbiddenException('Account is locked');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      if (!user || !user.isActive) {
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

  async logout(refreshToken: string, userId: string, ipAddress: string) {
    try {
      const payload = this.jwtService.decode(refreshToken) as any;
      
      await this.revokeRefreshToken(refreshToken);
      
      // Delete all user sessions
      await this.redisService.delPattern(`session:${userId}:*`);

      // Log logout
      if (payload?.sub) {
        await this.prisma.securityLog.create({
          data: {
            userId: payload.sub,
            action: 'LOGOUT',
            ipAddress,
            metadata: { method: 'manual' },
          },
        });
      }

      this.logger.log(`User logged out: ${payload?.email}`);
    } catch (error) {
      this.logger.error('Logout error', error);
    }
  }

  async logoutAllDevices(userId: string, ipAddress: string) {
    // Revoke all refresh tokens by pattern
    await this.redisService.delPattern(`refresh:${userId}:*`);
    await this.redisService.delPattern(`session:${userId}:*`);

    // Log logout all
    await this.prisma.securityLog.create({
      data: {
        userId,
        action: 'LOGOUT_ALL',
        ipAddress,
        metadata: { method: 'all_devices' },
      },
    });

    this.logger.log(`User logged out from all devices: ${userId}`);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ipAddress: string,
    userAgent: string,
  ) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });

    // Log password change
    await this.prisma.securityLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGE',
        ipAddress,
        userAgent,
      },
    });

    // Revoke all refresh tokens to force re-login
    await this.redisService.delPattern(`refresh:${userId}:*`);

    this.logger.log(`Password changed for user: ${userId}`);

    return { message: 'Password changed successfully. Please login again.' };
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
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

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerified: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // Check if account is locked
    const lockoutStatus = await this.lockoutService.checkLockout(userId);
    if (lockoutStatus.isLocked) {
      return null;
    }

    return user;
  }

  // Admin: Get security logs for a user
  async getSecurityLogs(userId: string, limit: number = 50) {
    return this.prisma.securityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Admin: Unlock user account
  async adminUnlockAccount(
    targetUserId: string,
    adminId: string,
    ipAddress: string,
  ) {
    await this.lockoutService.unlockAccount(targetUserId, adminId, ipAddress);
    return { message: 'Account unlocked successfully' };
  }
}
