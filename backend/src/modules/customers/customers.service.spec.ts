import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import { StripeService } from '../../common/stripe/stripe.service';
import { CustomersService } from './customers.service';

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    stripe_customer_id: null as string | null,
    ...overrides,
  } as never;
}

describe('CustomersService', () => {
  const prisma = {
    t_mtr_users: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;
  const stripe = {
    retrieveCustomer: jest.fn(),
    createCustomer: jest.fn(),
    createBillingPortalSession: jest.fn(),
  } as unknown as StripeService;
  const config = {
    get: jest.fn<string, [string]>().mockImplementation((key: string) => {
      if (key === 'FRONTEND_URL') return 'https://app.example.com';
      return undefined;
    }),
  } as unknown as ConfigService;
  const service = new CustomersService(prisma, stripe, config);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.t_mtr_users.update as jest.Mock).mockResolvedValue({});
  });

  describe('ensureCustomer', () => {
    it('returns the existing Stripe customer when stripe_customer_id is set', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(
        user({ stripe_customer_id: 'cus_existing' }),
      );
      (stripe.retrieveCustomer as jest.Mock).mockResolvedValue({ id: 'cus_existing' });

      const result = await service.ensureCustomer('user-1');

      expect(result.id).toBe('cus_existing');
      expect(stripe.retrieveCustomer).toHaveBeenCalledWith('cus_existing');
      expect(stripe.createCustomer).not.toHaveBeenCalled();
      expect(prisma.t_mtr_users.update).not.toHaveBeenCalled();
    });

    it('resets a stale link and creates a new customer on resource_missing', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(
        user({ stripe_customer_id: 'cus_stale' }),
      );
      (stripe.retrieveCustomer as jest.Mock).mockRejectedValue({
        code: 'resource_missing',
        message: 'No such customer',
      });
      (stripe.createCustomer as jest.Mock).mockResolvedValue({ id: 'cus_recreated' });

      const result = await service.ensureCustomer('user-1');

      expect(result.id).toBe('cus_recreated');
      // Stale id is unset before the new customer is created.
      expect(prisma.t_mtr_users.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { stripe_customer_id: null },
      });
      // Recreation must use a different discriminator, otherwise the
      // idempotency store replays the deleted customer under the old key.
      expect(stripe.createCustomer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ discriminator: 'recreatecus_stale' }),
      );
    });

    it('treats a deleted:true response as a stale link and recreates', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(
        user({ stripe_customer_id: 'cus_deleted' }),
      );
      (stripe.retrieveCustomer as jest.Mock).mockResolvedValue({ id: 'cus_deleted', deleted: true });
      (stripe.createCustomer as jest.Mock).mockResolvedValue({ id: 'cus_recreated' });

      const result = await service.ensureCustomer('user-1');

      expect(result.id).toBe('cus_recreated');
      expect(prisma.t_mtr_users.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { stripe_customer_id: null },
      });
      expect(stripe.createCustomer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ discriminator: 'recreatecus_deleted' }),
      );
    });

    it('propagates non-resource_missing retrieve errors untouched', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(
        user({ stripe_customer_id: 'cus_existing' }),
      );
      (stripe.retrieveCustomer as jest.Mock).mockRejectedValue(
        Object.assign(new Error('too many requests'), { code: 'rate_limit_error' }),
      );

      await expect(service.ensureCustomer('user-1')).rejects.toThrow('too many requests');
      expect(prisma.t_mtr_users.update).not.toHaveBeenCalled();
      expect(stripe.createCustomer).not.toHaveBeenCalled();
    });

    it('creates a customer and persists the id when the user has none', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(user());
      (stripe.createCustomer as jest.Mock).mockResolvedValue({ id: 'cus_new' });

      const result = await service.ensureCustomer('user-1');

      expect(result.id).toBe('cus_new');
      expect(stripe.createCustomer).toHaveBeenCalledWith(
        {
          email: 'user@example.com',
          name: 'Test User',
          metadata: { userId: 'user-1', platform: 'event-ticketing' },
        },
        { operation: 'customer_create', entityId: 'user-1', discriminator: '1', fingerprint: { userId: 'user-1' } },
      );
      expect(prisma.t_mtr_users.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { stripe_customer_id: 'cus_new' },
      });
    });

    it('retries the DB update when the first attempt fails and links the customer', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(user());
      (stripe.createCustomer as jest.Mock).mockResolvedValue({ id: 'cus_new' });
      (prisma.t_mtr_users.update as jest.Mock)
        .mockRejectedValueOnce(new Error('db hiccup'))
        .mockResolvedValueOnce({});

      const result = await service.ensureCustomer('user-1');

      expect(result.id).toBe('cus_new');
      expect(stripe.createCustomer).toHaveBeenCalledTimes(1);
      expect(prisma.t_mtr_users.update).toHaveBeenCalledTimes(2);
    });

    it('propagates the error when the DB update keeps failing (no duplicate customer)', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(user());
      (stripe.createCustomer as jest.Mock).mockResolvedValue({ id: 'cus_new' });
      (prisma.t_mtr_users.update as jest.Mock).mockRejectedValue(new Error('db down'));

      await expect(service.ensureCustomer('user-1')).rejects.toThrow('db down');
      // Only one Stripe customer is ever created for the user.
      expect(stripe.createCustomer).toHaveBeenCalledTimes(1);
      expect(prisma.t_mtr_users.update).toHaveBeenCalledTimes(3);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.ensureCustomer('user-404')).rejects.toThrow(NotFoundException);
      expect(stripe.createCustomer).not.toHaveBeenCalled();
    });

    it('propagates Stripe errors from createCustomer', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(user());
      (stripe.createCustomer as jest.Mock).mockRejectedValue(new Error('stripe down'));

      await expect(service.ensureCustomer('user-1')).rejects.toThrow('stripe down');
      expect(prisma.t_mtr_users.update).not.toHaveBeenCalled();
    });
  });

  describe('getCustomerInfo', () => {
    it('returns owner-safe info for a user with a linked customer', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(
        user({ stripe_customer_id: 'cus_existing' }),
      );

      await expect(service.getCustomerInfo('user-1')).resolves.toEqual({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        stripeCustomerId: 'cus_existing',
      });
      expect(stripe.createCustomer).not.toHaveBeenCalled();
    });

    it('returns null stripeCustomerId without creating a customer', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(user());

      await expect(service.getCustomerInfo('user-1')).resolves.toEqual({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        stripeCustomerId: null,
      });
      expect(stripe.createCustomer).not.toHaveBeenCalled();
      expect(stripe.retrieveCustomer).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getCustomerInfo('user-404')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createPortalSession', () => {
    it('reuses the linked customer and returns the portal url', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(
        user({ stripe_customer_id: 'cus_existing' }),
      );
      (stripe.retrieveCustomer as jest.Mock).mockResolvedValue({ id: 'cus_existing' });
      (stripe.createBillingPortalSession as jest.Mock).mockResolvedValue({
        url: 'https://billing.stripe.com/session/abc',
      });

      const url = await service.createPortalSession('user-1', 'https://app.example.com/account');

      expect(url).toBe('https://billing.stripe.com/session/abc');
      expect(stripe.createBillingPortalSession).toHaveBeenCalledWith(
        'cus_existing',
        'https://app.example.com/account',
      );
      expect(stripe.createCustomer).not.toHaveBeenCalled();
    });

    it('auto-creates the customer first when the user has none', async () => {
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(user());
      (stripe.createCustomer as jest.Mock).mockResolvedValue({ id: 'cus_new' });
      (stripe.createBillingPortalSession as jest.Mock).mockResolvedValue({
        url: 'https://billing.stripe.com/session/xyz',
      });

      const url = await service.createPortalSession('user-1', 'https://app.example.com/account');

      expect(url).toBe('https://billing.stripe.com/session/xyz');
      expect(stripe.createCustomer).toHaveBeenCalledTimes(1);
      expect(stripe.createBillingPortalSession).toHaveBeenCalledWith(
        'cus_new',
        'https://app.example.com/account',
      );
    });

    it('rejects a cross-origin returnUrl (open redirect, CWE-601)', async () => {
      await expect(
        service.createPortalSession('user-1', 'https://evil.example.com/phish'),
      ).rejects.toThrow(BadRequestException);
      expect(stripe.createBillingPortalSession).not.toHaveBeenCalled();
      expect(stripe.createCustomer).not.toHaveBeenCalled();
    });

    it('rejects a returnUrl on a lookalike domain (origin includes host exactly)', async () => {
      await expect(
        service.createPortalSession('user-1', 'https://app.example.com.evil.io/profile'),
      ).rejects.toThrow(BadRequestException);
      expect(stripe.createBillingPortalSession).not.toHaveBeenCalled();
    });

    it('rejects a malformed returnUrl', async () => {
      await expect(service.createPortalSession('user-1', 'not-a-url')).rejects.toThrow(
        BadRequestException,
      );
      expect(stripe.createBillingPortalSession).not.toHaveBeenCalled();
    });

    it('accepts a same-origin returnUrl with path and query string', async () => {
      // FRONTEND_URL https://app.example.com → same origin required.
      (prisma.t_mtr_users.findUnique as jest.Mock).mockResolvedValue(
        user({ stripe_customer_id: 'cus_existing' }),
      );
      (stripe.retrieveCustomer as jest.Mock).mockResolvedValue({ id: 'cus_existing' });
      (stripe.createBillingPortalSession as jest.Mock).mockResolvedValue({
        url: 'https://billing.stripe.com/session/ok',
      });

      const url = await service.createPortalSession(
        'user-1',
        'https://app.example.com/billing?tab=1',
      );

      expect(url).toBe('https://billing.stripe.com/session/ok');
    });
  });
});
