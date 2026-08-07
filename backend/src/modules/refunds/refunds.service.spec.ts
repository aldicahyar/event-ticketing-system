import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { RefundStatus } from '@prisma/client';
import { RefundsService } from './refunds.service';
import { RefundsRepository } from './refunds.repository';
import { RefundPolicyService } from './refund-policy.service';
import { StripeService } from '../../common/stripe/stripe.service';
import { PaymentAuditService } from '../payments/audit/payment-audit.service';
import { NotificationsService } from '../notifications/notifications.service';

const booking = {
  id: 'booking-1', user_id: 'user-1', status: 'CONFIRMED', total_price: 800000,
  currency: 'IDR', booking_code: 'BOK-1',
  event: { title: 'Concert', status: 'PUBLISHED', organizer_id: 'org-1', start_date_time: new Date('2026-08-10') },
  payment: { id: 'pay-1', status: 'COMPLETED', provider_tx_id: 'pi_1' },
  user: { id: 'user-1', name: 'User', email: 'user@test.com' },
};

const refund = {
  id: 'refund-1', booking_id: 'booking-1', payment_id: 'pay-1', amount: 400000,
  currency: 'IDR', percentage: 50, reason: 'SCHEDULE_CONFLICT',
  status: RefundStatus.REQUESTED, requested_by: 'user-1',
  booking, requester: booking.user, reviewer: null,
};

describe('RefundsService', () => {
  let service: RefundsService;
  let repository: Record<string, jest.Mock>;
  let stripe: { createRefund: jest.Mock };

  beforeEach(async () => {
    repository = {
      findBookingForRefund: jest.fn().mockResolvedValue(booking),
      findActiveByBooking: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(refund),
      findById: jest.fn().mockResolvedValue(refund),
      update: jest.fn().mockImplementation((_id, data) => Promise.resolve({ ...refund, ...data })),
      findMine: jest.fn(), findAll: jest.fn(), listPolicies: jest.fn(), listPolicyAudit: jest.fn(),
      ensureDefaultPolicies: jest.fn(), findPolicy: jest.fn(), updatePolicy: jest.fn(), createPolicyAudit: jest.fn(),
    };
    stripe = { createRefund: jest.fn().mockResolvedValue({ id: 're_1', status: 'succeeded' }) };
    const module = await Test.createTestingModule({
      providers: [
        RefundsService,
        { provide: RefundsRepository, useValue: repository },
        { provide: RefundPolicyService, useValue: { evaluate: jest.fn().mockResolvedValue({ eligible: true, ruleCode: 'TIER_1_7D', percentage: 50, amount: 400000 }), invalidateCache: jest.fn() } },
        { provide: StripeService, useValue: stripe },
        { provide: PaymentAuditService, useValue: { record: jest.fn() } },
        { provide: NotificationsService, useValue: { sendRefundStatus: jest.fn() } },
      ],
    }).compile();
    service = module.get(RefundsService);
  });

  it('creates a refund request with server-calculated amount', async () => {
    const result = await service.create('user-1', { booking_id: 'booking-1', reason: 'SCHEDULE_CONFLICT' });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 400000, percentage: 50 }));
    expect(result.id).toBe('refund-1');
  });

  it('rejects duplicate active request', async () => {
    repository.findActiveByBooking.mockResolvedValue(refund);
    await expect(service.create('user-1', { booking_id: 'booking-1', reason: 'OTHER' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows any organizer to process a refund regardless of event owner', async () => {
    const result = await service.approve('refund-1', { id: 'org-2', role: 'ORGANIZER' });
    expect(stripe.createRefund).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(RefundStatus.COMPLETED);
  });

  it('approves and issues exactly one idempotent Stripe refund', async () => {
    const result = await service.approve('refund-1', { id: 'admin-1', role: 'ADMIN' });
    expect(stripe.createRefund).toHaveBeenCalledTimes(1);
    expect(stripe.createRefund).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_1', amount: 40000000 }),
      expect.objectContaining({ operation: 'refund', discriminator: 'refund-1' }),
    );
    expect(result.status).toBe(RefundStatus.COMPLETED);
  });

  it('rejects illegal terminal state transition', async () => {
    repository.findById.mockResolvedValue({ ...refund, status: RefundStatus.COMPLETED });
    await expect(service.reject('refund-1', { id: 'admin-1', role: 'ADMIN' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('validates policy update has at least one field', async () => {
    await expect(service.updatePolicy('TIER_1_7D', {}, 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('audits old/new values and invalidates cache after policy update', async () => {
    repository.findPolicy.mockResolvedValue({ id: 'policy-1', rule_code: 'TIER_1_7D', percentage: 50, is_active: true });
    repository.updatePolicy.mockResolvedValue({ id: 'policy-1', percentage: 75 });
    await service.updatePolicy('TIER_1_7D', { percentage: 75 }, 'admin-1');
    expect(repository.createPolicyAudit).toHaveBeenCalledWith(expect.objectContaining({ old_value: '50', new_value: '75', changed_by: 'admin-1' }));
  });
});
