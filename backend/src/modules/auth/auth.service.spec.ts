import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AccountLockoutService } from './account-lockout.service';

function createRedisMock(available = true) {
  const store = new Map<string, string>();
  const ttlStore = new Map<string, number>();

  return {
    store,
    ttlStore,
    isAvailable: jest.fn(() => available),
    set: jest.fn(async (key: string, value: any, ttl?: number) => {
      store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
      if (ttl !== undefined) ttlStore.set(key, ttl);
    }),
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    del: jest.fn(async (key: string) => {
      store.delete(key);
      ttlStore.delete(key);
    }),
    exists: jest.fn(async (key: string) => store.has(key)),
    incr: jest.fn(async (key: string) => {
      const current = parseInt(store.get(key) ?? '0', 10);
      const next = current + 1;
      store.set(key, String(next));
      return next;
    }),
    ttl: jest.fn(async (key: string) => {
      if (!store.has(key)) return -2;
      return ttlStore.get(key) ?? -1;
    }),
  };
}

function createPrismaMock() {
  const security_logs: any[] = [];
  return {
    security_logs,
    t_trx_security_logs: {
      create: jest.fn(async ({ data }: any) => {
        security_logs.push(data);
        return data;
      }),
    },
    t_mtr_users: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('AuthService - OTP via Redis', () => {
  let service: AuthService;
  let redisMock: ReturnType<typeof createRedisMock>;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'ATTENDEE',
    is_active: true,
    email_verified: false,
    password: 'hashed',
    created_at: new Date(),
  };

  beforeEach(async () => {
    redisMock = createRedisMock();
    prismaMock = createPrismaMock();

    const lockoutMock = {
      checkLockoutByEmail: jest.fn().mockResolvedValue({ isLocked: false }),
      checkLockout: jest.fn().mockResolvedValue({ isLocked: false }),
      recordFailedAttempt: jest.fn(),
      getRemainingAttempts: jest.fn(),
      resetFailedAttempts: jest.fn(),
      unlockAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'secret') } },
        { provide: RedisService, useValue: redisMock },
        { provide: AccountLockoutService, useValue: lockoutMock },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('resendVerification - cooldown rate-limit', () => {
    beforeEach(() => {
      prismaMock.t_mtr_users.findUnique.mockResolvedValue(mockUser);
      redisMock.set.mockClear();
    });

    it('succeeds on first resend and stores cooldown key', async () => {
      const result = await service.resendVerification('test@example.com');
      expect(result.message).toBe('Verification code sent successfully');
      expect(redisMock.set).toHaveBeenCalledTimes(3); // code + attempts + cooldown
    });

    it('throws 429 when cooldown key already exists', async () => {
      redisMock.store.set('otp:cooldown:test@example.com', '1');

      await expect(service.resendVerification('test@example.com')).rejects.toThrow(HttpException);
      try {
        await service.resendVerification('test@example.com');
      } catch (e: any) {
        expect(e.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('logs OTP_RATE_LIMITED security event when rate-limited', async () => {
      redisMock.store.set('otp:cooldown:test@example.com', '1');

      try {
        await service.resendVerification('test@example.com');
      } catch {}

      expect(prismaMock.t_trx_security_logs.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'OTP_RATE_LIMITED' }) }),
      );
    });
  });

  describe('verifyEmail - code validation', () => {
    beforeEach(() => {
      prismaMock.t_mtr_users.findUnique.mockResolvedValue(mockUser);
    });

    it('succeeds with correct code and deletes from Redis', async () => {
      await redisMock.set('otp:verify:test@example.com', '482917', 900);
      await redisMock.set('otp:attempts:test@example.com', '0', 900);
      prismaMock.t_mtr_users.update.mockResolvedValue({ ...mockUser, email_verified: true });

      const result = await service.verifyEmail('test@example.com', '482917');

      expect(result.user.email_verified).toBe(true);
      expect(redisMock.store.has('otp:verify:test@example.com')).toBe(false);
      expect(redisMock.store.has('otp:attempts:test@example.com')).toBe(false);
    });

    it('atomically increments attempts via INCR on wrong code', async () => {
      await redisMock.set('otp:verify:test@example.com', '482917', 900);
      await redisMock.set('otp:attempts:test@example.com', '0', 900);

      await expect(service.verifyEmail('test@example.com', '000000')).rejects.toThrow(
        BadRequestException,
      );

      expect(redisMock.incr).toHaveBeenCalledWith('otp:attempts:test@example.com');
      expect(redisMock.store.get('otp:attempts:test@example.com')).toBe('1');
    });

    it('INCR does not reset TTL (no set call on attempts key during increment)', async () => {
      await redisMock.set('otp:verify:test@example.com', '482917', 900);
      await redisMock.set('otp:attempts:test@example.com', '0', 300); // 300s remaining

      await expect(service.verifyEmail('test@example.com', '000000')).rejects.toThrow();

      const attemptSetCalls = redisMock.set.mock.calls.filter(
        (c: any[]) => c[0] === 'otp:attempts:test@example.com',
      );
      // Only the initial store sets attempts key; INCR must NOT call set
      expect(attemptSetCalls).toHaveLength(1);
      expect(attemptSetCalls[0][2]).toBe(300);
    });

    it('deletes code after max attempts (5) and locks out', async () => {
      await redisMock.set('otp:verify:test@example.com', '482917', 900);
      await redisMock.set('otp:attempts:test@example.com', '4', 900);

      await expect(service.verifyEmail('test@example.com', '000000')).rejects.toThrow(
        /Too many invalid attempts/,
      );

      expect(redisMock.store.has('otp:verify:test@example.com')).toBe(false);
      expect(redisMock.store.has('otp:attempts:test@example.com')).toBe(false);
    });

    it('throws when code expired/not found (Redis returns null)', async () => {
      await expect(service.verifyEmail('test@example.com', '482917')).rejects.toThrow(
        /expired or not found/,
      );
    });
  });

  describe('Redis unavailability', () => {
    beforeEach(() => {
      prismaMock.t_mtr_users.findUnique.mockResolvedValue(mockUser);
    });

    it('resendVerification throws ServiceUnavailableException when Redis down', async () => {
      redisMock.isAvailable.mockReturnValue(false);

      await expect(service.resendVerification('test@example.com')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('resendVerification fails fast before DB lookup when Redis down', async () => {
      redisMock.isAvailable.mockReturnValue(false);

      await expect(service.resendVerification('test@example.com')).rejects.toThrow(
        ServiceUnavailableException,
      );

      // Should not even query the user since Redis check is first
      expect(prismaMock.t_mtr_users.findUnique).not.toHaveBeenCalled();
    });

    it('verifyEmail throws ServiceUnavailableException when Redis down', async () => {
      redisMock.isAvailable.mockReturnValue(false);

      await expect(service.verifyEmail('test@example.com', '482917')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('register throws ServiceUnavailableException pre-flight when Redis down', async () => {
      redisMock.isAvailable.mockReturnValue(false);
      prismaMock.t_mtr_users.findUnique.mockResolvedValue(null);

      await expect(
        service.register(
          {
            email: 'new@test.com',
            password: 'Password1!',
            confirmPassword: 'Password1!',
            name: 'New',
          } as any,
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(ServiceUnavailableException);

      // t_mtr_users should NOT have been created in the database
      expect(prismaMock.t_mtr_users.create).not.toHaveBeenCalled();
    });

    it('register rolls back user record if OTP storage fails after user creation', async () => {
      // Redis is available for the pre-flight check, then goes down for storeVerificationCode
      redisMock.isAvailable
        .mockReturnValueOnce(true) // pre-flight check passes
        .mockReturnValueOnce(false); // storeVerificationCode guard fails

      prismaMock.t_mtr_users.findUnique.mockResolvedValue(null);
      prismaMock.t_mtr_users.create.mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
        email: 'new@test.com',
      });
      prismaMock.t_mtr_users.delete.mockResolvedValue(undefined);

      await expect(
        service.register(
          {
            email: 'new@test.com',
            password: 'Password1!',
            confirmPassword: 'Password1!',
            name: 'New',
          } as any,
          '127.0.0.1',
          'test-agent',
        ),
      ).rejects.toThrow(ServiceUnavailableException);

      // t_mtr_users record should have been rolled back
      expect(prismaMock.t_mtr_users.delete).toHaveBeenCalledWith({ where: { id: 'new-user-id' } });
    });
  });

  describe('register - stores code in Redis (not Map)', () => {
    it('stores verification code and attempts counter in Redis with correct key prefixes', async () => {
      prismaMock.t_mtr_users.findUnique.mockResolvedValue(null);
      prismaMock.t_mtr_users.create.mockResolvedValue(mockUser);

      await service.register(
        {
          email: 'new@test.com',
          password: 'Password1!',
          confirmPassword: 'Password1!',
          name: 'New',
        } as any,
        '127.0.0.1',
        'test-agent',
      );

      const setCalls = redisMock.set.mock.calls;
      const codeCall = setCalls.find((c: any[]) => c[0] === 'otp:verify:new@test.com');
      const attemptsCall = setCalls.find((c: any[]) => c[0] === 'otp:attempts:new@test.com');
      expect(codeCall).toBeDefined();
      expect(attemptsCall).toBeDefined();
      expect(attemptsCall![1]).toBe('0');
    });
  });
});
