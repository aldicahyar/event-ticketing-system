import Stripe from 'stripe';
import {
  IWebhookEventHandler,
  WebhookHandlerResult,
} from '../../interfaces/webhook-handler.interface';
import { PrismaService } from '../../../../common/database/prisma.service';
import { PaymentsService } from '../../payments.service';
import { PaymentAuditService } from '../../audit/payment-audit.service';
import { CheckoutCompletedHandler } from './checkout-completed.handler';
import { CheckoutExpiredHandler } from './checkout-expired.handler';
import { PaymentFailedHandler } from './payment-failed.handler';
import { PaymentIntentSucceededHandler } from './payment-intent-succeeded.handler';
import { ChargeRefundedHandler } from './charge-refunded.handler';
import { DisputeCreatedHandler } from './dispute-created.handler';
import { DisputeClosedHandler } from './dispute-closed.handler';
import {
  DisputeFundsWithdrawnHandler,
  DisputeFundsReinstatedHandler,
} from './dispute-funds.handler';
import {
  EarlyFraudWarningHandler,
  ReviewOpenedHandler,
  ReviewClosedHandler,
} from './radar.handler';
import { AsyncPaymentFailedHandler } from './async-payment-failed.handler';
import { RefundUpdatedHandler } from './refund-updated.handler';
import { RefundFailedHandler } from './refund-failed.handler';
import { StripeService } from '../../../../common/stripe/stripe.service';
import { NotificationsService } from '../../../notifications/notifications.service';

// ── jest.mock() for all dependencies ──────────────────────────
jest.mock('../../../../common/database/prisma.service');
jest.mock('../../payments.service');
jest.mock('../../audit/payment-audit.service');

// ── Shared mock factories ─────────────────────────────────────

type PrismaMockTransaction = {
  t_trx_payments: Record<string, jest.Mock>;
  t_trx_bookings: Record<string, jest.Mock>;
  t_mtr_seats: Record<string, jest.Mock>;
  t_trx_tickets: Record<string, jest.Mock>;
  t_trx_refunds: Record<string, jest.Mock>;
  t_trx_security_logs: Record<string, jest.Mock>;
  t_trx_disputes: Record<string, jest.Mock>;
};

function makePrismaMock() {
  const prisma = {
    t_trx_payments: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    t_trx_bookings: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    t_mtr_seats: { updateMany: jest.fn() },
    t_trx_tickets: { deleteMany: jest.fn(), updateMany: jest.fn() },
    t_trx_refunds: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    t_trx_security_logs: { create: jest.fn() },
    t_trx_disputes: { findUnique: jest.fn() },
    $transaction: jest.fn(async (callback: (tx: PrismaMockTransaction) => Promise<unknown>) =>
      callback(prisma),
    ),
  };
  return prisma as unknown as PrismaService & typeof prisma;
}

function makeAuditMock() {
  return { record: jest.fn().mockResolvedValue(undefined) } as unknown as PaymentAuditService & {
    record: jest.Mock;
  };
}

function makePaymentsMock() {
  return { processSuccessfulPayment: jest.fn() } as unknown as PaymentsService & {
    processSuccessfulPayment: jest.Mock;
  };
}

function makeNotificationsMock() {
  return {
    sendRefundStatus: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService & {
    sendRefundStatus: jest.Mock;
  };
}

/** Build a minimal Stripe.Event mock. */
function makeEvent(type: string, object: Record<string, unknown>, id = 'evt_test'): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

// ── Tests ─────────────────────────────────────────────────────

describe('CheckoutCompletedHandler', () => {
  let handler: CheckoutCompletedHandler;
  let payments: ReturnType<typeof makePaymentsMock>;

  beforeEach(() => {
    payments = makePaymentsMock();
    handler = new CheckoutCompletedHandler(payments);
  });

  it('should be registered for the checkout.session.completed event type', () => {
    expect(handler.eventType).toBe('checkout.session.completed');
    expect(handler).toBeDefined();
  });

  it('should return success when processSuccessfulPayment returns "confirmed"', async () => {
    payments.processSuccessfulPayment.mockResolvedValue('confirmed');
    const event = makeEvent('checkout.session.completed', { id: 'cs_test' });

    const result = await handler.handle(event);

    expect(payments.processSuccessfulPayment).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: true,
      message: 'Booking confirmed for session cs_test',
    });
    expect(result.skipped).toBeUndefined();
  });

  it('should return skipped when processSuccessfulPayment returns "skipped"', async () => {
    payments.processSuccessfulPayment.mockResolvedValue('skipped');
    const event = makeEvent('checkout.session.completed', {
      id: 'cs_test',
      client_reference_id: 'bk_123',
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.message).toContain('bk_123');
  });

  it('should return success when processSuccessfulPayment returns "late"', async () => {
    payments.processSuccessfulPayment.mockResolvedValue('late');
    const event = makeEvent('checkout.session.completed', { id: 'cs_test' });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(result.message).toContain('cs_test');
    expect(result.message).toMatch(/auto-refunded/i);
    expect(result.skipped).toBeUndefined();
  });

  it('should return failure when processSuccessfulPayment throws', async () => {
    payments.processSuccessfulPayment.mockRejectedValue(new Error('boom'));
    const event = makeEvent('checkout.session.completed', { id: 'cs_test' });

    const result = await handler.handle(event);

    expect(result.success).toBe(false);
    expect(result.message).toContain('boom');
  });
});

describe('CheckoutExpiredHandler', () => {
  let handler: CheckoutExpiredHandler;

  beforeEach(() => {
    handler = new CheckoutExpiredHandler();
  });

  it('should be registered for the checkout.session.expired event type', () => {
    expect(handler.eventType).toBe('checkout.session.expired');
  });

  it('should return success and log the session expiry', async () => {
    const event = makeEvent('checkout.session.expired', {
      id: 'cs_test',
      client_reference_id: 'bk_123',
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(result.message).toContain('cs_test');
    expect(result.message).toContain('bk_123');
    expect(result.message).toMatch(/expired/i);
  });

  it('should handle a missing client_reference_id gracefully', async () => {
    const event = makeEvent('checkout.session.expired', { id: 'cs_test' });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(result.message).toContain('N/A');
  });
});

describe('PaymentFailedHandler', () => {
  let handler: PaymentFailedHandler;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    handler = new PaymentFailedHandler(prisma);
  });

  it('should be registered for the payment_intent.payment_failed event type', () => {
    expect(handler.eventType).toBe('payment_intent.payment_failed');
  });

  it('should update payment status to FAILED when payment record found', async () => {
    prisma.t_trx_payments.findFirst.mockResolvedValue({ id: 'pay_123' });
    const event = makeEvent('payment_intent.payment_failed', {
      id: 'pi_test',
      amount: 5000,
      last_payment_error: { message: 'card declined' },
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(prisma.t_trx_payments.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.t_trx_payments.update).toHaveBeenCalledWith({
      where: { id: 'pay_123' },
      data: { status: 'FAILED' },
    });
    expect(result.message).toContain('pay_123');
  });

  it('should skip when no payment record found', async () => {
    prisma.t_trx_payments.findFirst.mockResolvedValue(null);
    const event = makeEvent('payment_intent.payment_failed', {
      id: 'pi_test',
      amount: 5000,
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(prisma.t_trx_payments.update).not.toHaveBeenCalled();
    expect(result.message).toContain('pi_test');
  });

  it('should return failure when the DB update throws', async () => {
    prisma.t_trx_payments.findFirst.mockResolvedValue({ id: 'pay_123' });
    prisma.t_trx_payments.update.mockRejectedValue(new Error('db down'));
    const event = makeEvent('payment_intent.payment_failed', { id: 'pi_test', amount: 5000 });

    const result = await handler.handle(event);

    expect(result.success).toBe(false);
    expect(result.message).toContain('pi_test');
  });
});

describe('ChargeRefundedHandler', () => {
  let handler: ChargeRefundedHandler;
  let prisma: ReturnType<typeof makePrismaMock>;
  let audit: ReturnType<typeof makeAuditMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    audit = makeAuditMock();
    handler = new ChargeRefundedHandler(prisma, audit);
  });

  it('should be registered for the charge.refunded event type', () => {
    expect(handler.eventType).toBe('charge.refunded');
  });

  it('should update payment status to REFUNDED and cancel CONFIRMED booking', async () => {
    const stripeRefund = {
      id: 're_test',
      amount: 10000,
      currency: 'idr',
      reason: null,
    };
    prisma.t_trx_payments.findFirst.mockResolvedValue({
      id: 'pay_123',
      amount: 100,
      booking_id: 'bk_1',
      booking: { id: 'bk_1', user_id: 'user_1', booking_code: 'BC-001' },
    });
    prisma.t_trx_refunds.findFirst.mockResolvedValue(null);
    const event = makeEvent('charge.refunded', {
      id: 'ch_test',
      payment_intent: 'pi_test',
      refunds: { data: [stripeRefund] },
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(prisma.t_trx_refunds.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stripe_refund_id: 're_test',
        payment_id: 'pay_123',
        status: 'PROCESSING',
      }),
    });
    expect(prisma.t_trx_payments.update).not.toHaveBeenCalled();
    expect(prisma.t_trx_bookings.update).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      'user_1',
      'EXTERNAL_REFUND_SYNCED',
      expect.objectContaining({ charge_id: 'ch_test' }),
    );
  });

  it('should skip when the charge has no expanded refund records', async () => {
    prisma.t_trx_payments.findFirst.mockResolvedValue({
      id: 'pay_123',
      amount: 100,
      booking_id: 'bk_1',
      booking: { id: 'bk_1', user_id: 'user_1', booking_code: 'BC-001' },
    });
    const event = makeEvent('charge.refunded', {
      id: 'ch_test',
      payment_intent: 'pi_test',
      refunds: { data: [] },
    });

    const result = await handler.handle(event);

    expect(result).toEqual(expect.objectContaining({ success: true, skipped: true }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.t_trx_refunds.create).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('should be idempotent when the refund is already linked', async () => {
    prisma.t_trx_payments.findFirst.mockResolvedValue({
      id: 'pay_123',
      amount: 100,
      booking_id: 'bk_1',
      booking: { id: 'bk_1', user_id: 'user_1', booking_code: 'BC-001' },
    });
    prisma.t_trx_refunds.findFirst.mockResolvedValue({
      id: 'refund_1',
      stripe_refund_id: 're_test',
    });
    prisma.t_trx_refunds.updateMany.mockResolvedValue({ count: 0 });
    const event = makeEvent('charge.refunded', {
      id: 'ch_test',
      payment_intent: 'pi_test',
      refunds: { data: [{ id: 're_test', amount: 10000, currency: 'idr', reason: null }] },
    });

    const result = await handler.handle(event);

    expect(result).toEqual(expect.objectContaining({ success: true, skipped: true }));
    expect(prisma.t_trx_refunds.create).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('should skip when charge has no payment_intent', async () => {
    const event = makeEvent('charge.refunded', {
      id: 'ch_test',
      payment_intent: null,
      amount: 10000,
      amount_refunded: 0,
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.message).toContain('ch_test');
    expect(prisma.t_trx_payments.findFirst).not.toHaveBeenCalled();
    expect(prisma.t_trx_payments.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('should skip when no payment record is found', async () => {
    prisma.t_trx_payments.findFirst.mockResolvedValue(null);
    const event = makeEvent('charge.refunded', {
      id: 'ch_test',
      payment_intent: 'pi_test',
      amount: 10000,
      amount_refunded: 10000,
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(prisma.t_trx_payments.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});

describe('RefundUpdatedHandler', () => {
  let handler: RefundUpdatedHandler;
  let prisma: ReturnType<typeof makePrismaMock>;
  let notifications: ReturnType<typeof makeNotificationsMock>;

  const refundRecord = {
    id: 'refund_1',
    booking_id: 'bk_1',
    payment_id: 'pay_1',
    requested_by: 'user_1',
    amount: 100,
    currency: 'IDR',
    status: 'PROCESSING',
    completed_at: null,
    requester: { id: 'user_1', name: 'User', email: 'user@test.com' },
    booking: { id: 'bk_1', booking_code: 'BC-001', event: { title: 'Concert' } },
  };

  beforeEach(() => {
    prisma = makePrismaMock();
    notifications = makeNotificationsMock();
    handler = new RefundUpdatedHandler(prisma, notifications);
  });

  it('should finalize refund, booking, payment, seats, tickets, and audit atomically', async () => {
    prisma.t_trx_refunds.findUnique.mockResolvedValue(refundRecord);
    prisma.t_trx_refunds.updateMany.mockResolvedValue({ count: 1 });
    const event = makeEvent('refund.updated', {
      id: 're_test',
      status: 'succeeded',
      amount: 10000,
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.t_trx_bookings.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'bk_1' }) }),
    );
    expect(prisma.t_trx_payments.updateMany).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: { status: 'REFUNDED' },
    });
    expect(prisma.t_mtr_seats.updateMany).toHaveBeenCalledWith({
      where: { booking_id: 'bk_1' },
      data: { booking_id: null, status: 'AVAILABLE' },
    });
    expect(prisma.t_trx_tickets.deleteMany).toHaveBeenCalledWith({
      where: { booking_id: 'bk_1' },
    });
    expect(prisma.t_trx_security_logs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'REFUND_SUCCEEDED', user_id: 'user_1' }),
    });
    expect(notifications.sendRefundStatus).toHaveBeenCalledWith(
      'user@test.com',
      expect.objectContaining({ status: 'COMPLETED', bookingCode: 'BC-001' }),
    );
  });

  it('should not notify when atomic finalization rolls back', async () => {
    prisma.t_trx_refunds.findUnique.mockResolvedValue(refundRecord);
    prisma.$transaction.mockRejectedValue(new Error('audit write failed'));
    const event = makeEvent('refund.updated', {
      id: 're_test',
      status: 'succeeded',
      amount: 10000,
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(false);
    expect(notifications.sendRefundStatus).not.toHaveBeenCalled();
  });

  it('should skip duplicate finalization from an invalid local state', async () => {
    prisma.t_trx_refunds.findUnique.mockResolvedValue({ ...refundRecord, status: 'REJECTED' });
    prisma.t_trx_refunds.updateMany.mockResolvedValue({ count: 0 });
    const event = makeEvent('refund.updated', {
      id: 're_test',
      status: 'succeeded',
      amount: 10000,
    });

    const result = await handler.handle(event);

    expect(result).toEqual(expect.objectContaining({ success: true, skipped: true }));
    expect(prisma.t_trx_bookings.updateMany).not.toHaveBeenCalled();
    expect(notifications.sendRefundStatus).not.toHaveBeenCalled();
  });
});

describe('DisputeCreatedHandler', () => {
  let handler: DisputeCreatedHandler;
  let prisma: ReturnType<typeof makePrismaMock>;
  let disputes: { opened: jest.Mock };

  beforeEach(() => {
    prisma = makePrismaMock();
    disputes = { opened: jest.fn().mockResolvedValue({ id: 'local-dispute' }) };
    handler = new DisputeCreatedHandler(prisma, disputes as never);
  });

  it('should be registered for the charge.dispute.created event type', () => {
    expect(handler.eventType).toBe('charge.dispute.created');
  });

  it('should delegate atomic opening and retain seats', async () => {
    prisma.t_trx_payments.findFirst.mockResolvedValue({ id: 'pay_123' });
    const dueBy = 1_800_000_000;
    const event = makeEvent('charge.dispute.created', {
      id: 'dp_test',
      charge: 'ch_test',
      payment_intent: 'pi_test',
      amount: 10000,
      currency: 'usd',
      reason: 'fraudulent',
      evidence_details: { due_by: dueBy },
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(disputes.opened).toHaveBeenCalledWith({
      stripe_dispute_id: 'dp_test',
      paymentId: 'pay_123',
      amount: 100,
      currency: 'USD',
      reason: 'fraudulent',
      dueBy: new Date(dueBy * 1000),
    });
    expect(prisma.t_mtr_seats.updateMany).not.toHaveBeenCalled();
  });

  it('should fail when atomic lifecycle opening fails', async () => {
    prisma.t_trx_payments.findFirst.mockResolvedValue({ id: 'pay_123' });
    disputes.opened.mockRejectedValue(new Error('transaction failed'));
    const event = makeEvent('charge.dispute.created', {
      id: 'dp_test',
      charge: 'ch_test',
      payment_intent: 'pi_test',
      amount: 10000,
      currency: 'usd',
      reason: 'fraudulent',
      evidence_details: { due_by: null },
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(false);
    expect(result.message).toContain('transaction failed');
  });

  it('should skip when no matching payment record', async () => {
    prisma.t_trx_payments.findFirst.mockResolvedValue(null);
    const event = makeEvent('charge.dispute.created', {
      id: 'dp_test',
      charge: 'ch_test',
      payment_intent: 'pi_test',
      amount: 10000,
      reason: 'fraudulent',
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(prisma.t_trx_payments.update).not.toHaveBeenCalled();
    expect(prisma.t_trx_bookings.update).not.toHaveBeenCalled();
    expect(disputes.opened).not.toHaveBeenCalled();
    expect(result.message).toContain('dp_test');
  });

  it('should accept an expanded charge/payment_intent object', async () => {
    prisma.t_trx_payments.findFirst.mockResolvedValue({
      id: 'pay_123',
      booking: { id: 'bk_1', user_id: 'user_1', booking_code: 'BC-001', status: 'CONFIRMED' },
    });
    const event = makeEvent('charge.dispute.created', {
      id: 'dp_test',
      charge: { id: 'ch_test' },
      payment_intent: { id: 'pi_test' },
      amount: 10000,
      currency: 'usd',
      reason: 'product_not_received',
      evidence_details: { due_by: 1_800_000_000 },
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(disputes.opened).toHaveBeenCalled();
  });
});

describe('DisputeClosedHandler', () => {
  it.each([
    ['won', 'WON'],
    ['lost', 'LOST'],
  ])('delegates %s lifecycle outcome', async (stripeStatus, localStatus) => {
    const disputes = { resolved: jest.fn().mockResolvedValue({}) };
    const handler = new DisputeClosedHandler(disputes as never);
    const result = await handler.handle(
      makeEvent('charge.dispute.closed', {
        id: 'dp_test',
        status: stripeStatus,
      }),
    );

    expect(result.success).toBe(true);
    expect(disputes.resolved).toHaveBeenCalledWith('dp_test', localStatus);
  });

  it('returns success=false when atomic close fails', async () => {
    const disputes = {
      resolved: jest.fn().mockRejectedValue(new Error('transaction failed')),
    };
    const handler = new DisputeClosedHandler(disputes as never);
    const result = await handler.handle(
      makeEvent('charge.dispute.closed', { id: 'dp_test', status: 'lost' }),
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('transaction failed');
  });
});

describe('AsyncPaymentFailedHandler', () => {
  let handler: AsyncPaymentFailedHandler;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    handler = new AsyncPaymentFailedHandler(prisma);
  });

  it('should be registered for the checkout.session.async_payment_failed event type', () => {
    expect(handler.eventType).toBe('checkout.session.async_payment_failed');
  });

  it('should expire booking and release seats', async () => {
    const event = makeEvent('checkout.session.async_payment_failed', {
      id: 'cs_test',
      client_reference_id: 'bk_123',
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    // Booking → EXPIRED (only if currently PENDING)
    expect(prisma.t_trx_bookings.updateMany).toHaveBeenCalledWith({
      where: { id: 'bk_123', status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
    // Seats released
    expect(prisma.t_mtr_seats.updateMany).toHaveBeenCalledWith({
      where: { booking_id: 'bk_123' },
      data: { booking_id: null, status: 'AVAILABLE' },
    });
    // Payment record → FAILED
    expect(prisma.t_trx_payments.updateMany).toHaveBeenCalledWith({
      where: { booking_id: 'bk_123' },
      data: { status: 'FAILED' },
    });
    expect(result.message).toContain('bk_123');
  });

  it('should skip when no client_reference_id', async () => {
    const event = makeEvent('checkout.session.async_payment_failed', {
      id: 'cs_test',
      client_reference_id: null,
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(prisma.t_trx_bookings.updateMany).not.toHaveBeenCalled();
    expect(prisma.t_mtr_seats.updateMany).not.toHaveBeenCalled();
    expect(prisma.t_trx_payments.updateMany).not.toHaveBeenCalled();
    expect(result.message).toContain('cs_test');
  });

  it('should return failure when a DB update throws', async () => {
    prisma.t_trx_bookings.updateMany.mockRejectedValue(new Error('db down'));
    const event = makeEvent('checkout.session.async_payment_failed', {
      id: 'cs_test',
      client_reference_id: 'bk_123',
    });

    const result = await handler.handle(event);

    expect(result.success).toBe(false);
    expect(result.message).toContain('cs_test');
  });
});

// ── PaymentIntentSucceededHandler ────────────────────────────

describe('PaymentIntentSucceededHandler', () => {
  let handler: PaymentIntentSucceededHandler;
  let payments: ReturnType<typeof makePaymentsMock>;
  let stripe: { listCheckoutSessions: jest.Mock };

  beforeEach(() => {
    payments = makePaymentsMock();
    stripe = { listCheckoutSessions: jest.fn() };
    handler = new PaymentIntentSucceededHandler(
      { listCheckoutSessions: stripe.listCheckoutSessions } as unknown as StripeService,
      payments,
    );
  });

  it('should be registered for the payment_intent.succeeded event type', () => {
    expect(handler.eventType).toBe('payment_intent.succeeded');
  });

  it('should confirm the booking via the matched checkout session', async () => {
    stripe.listCheckoutSessions.mockResolvedValue({
      data: [{ id: 'cs_123', payment_status: 'paid' }],
    });
    payments.processSuccessfulPayment.mockResolvedValue('confirmed');

    const result = await handler.handle(makeEvent('payment_intent.succeeded', { id: 'pi_123' }));

    expect(stripe.listCheckoutSessions).toHaveBeenCalledWith({
      payment_intent: 'pi_123',
      limit: 1,
    });
    expect(payments.processSuccessfulPayment).toHaveBeenCalledWith({
      id: 'cs_123',
      payment_status: 'paid',
    });
    expect(result).toEqual({
      success: true,
      message: expect.stringContaining('pi_123'),
    });
  });

  it('should skip when no session references the payment intent', async () => {
    stripe.listCheckoutSessions.mockResolvedValue({ data: [] });

    const result = await handler.handle(makeEvent('payment_intent.succeeded', { id: 'pi_orphan' }));

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(payments.processSuccessfulPayment).not.toHaveBeenCalled();
  });

  it('should skip when the session is not paid', async () => {
    stripe.listCheckoutSessions.mockResolvedValue({
      data: [{ id: 'cs_123', payment_status: 'unpaid' }],
    });

    const result = await handler.handle(makeEvent('payment_intent.succeeded', { id: 'pi_123' }));

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(payments.processSuccessfulPayment).not.toHaveBeenCalled();
  });
});

// ── Dispute funds handlers ───────────────────────────────────

const disputeRecord = {
  id: 'dsp_1',
  amount: 100,
  currency: 'IDR',
  payment: { booking: { user_id: 'usr_1', booking_code: 'BOK-1' } },
};

describe('DisputeFundsWithdrawnHandler', () => {
  let handler: DisputeFundsWithdrawnHandler;
  let prisma: ReturnType<typeof makePrismaMock>;
  let audit: ReturnType<typeof makeAuditMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    prisma.t_trx_disputes.findUnique.mockResolvedValue(disputeRecord);
    audit = makeAuditMock();
    handler = new DisputeFundsWithdrawnHandler(prisma, audit);
  });

  it('should be registered for charge.dispute.funds_withdrawn', () => {
    expect(handler.eventType).toBe('charge.dispute.funds_withdrawn');
  });

  it('should record a DISPUTE_FUNDS_WITHDRAWN audit entry', async () => {
    const result = await handler.handle(
      makeEvent('charge.dispute.funds_withdrawn', { id: 'dp_1' }),
    );

    expect(result.success).toBe(true);
    expect(audit.record).toHaveBeenCalledWith('usr_1', 'DISPUTE_FUNDS_WITHDRAWN', {
      dispute_id: 'dsp_1',
      stripe_dispute_id: 'dp_1',
      amount: 100,
      currency: 'IDR',
      booking_code: 'BOK-1',
      source: 'stripe_webhook',
    });
  });

  it('should skip when no local dispute matches', async () => {
    prisma.t_trx_disputes.findUnique.mockResolvedValue(null);
    const result = await handler.handle(
      makeEvent('charge.dispute.funds_withdrawn', { id: 'dp_unknown' }),
    );

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(audit.record).not.toHaveBeenCalled();
  });
});

describe('DisputeFundsReinstatedHandler', () => {
  it('should be registered for charge.dispute.funds_reinstated', () => {
    const handler = new DisputeFundsReinstatedHandler(makePrismaMock(), makeAuditMock());
    expect(handler.eventType).toBe('charge.dispute.funds_reinstated');
  });

  it('should record a DISPUTE_FUNDS_REINSTATED audit entry', async () => {
    const prisma = makePrismaMock();
    prisma.t_trx_disputes.findUnique.mockResolvedValue(disputeRecord);
    const audit = makeAuditMock();
    const handler = new DisputeFundsReinstatedHandler(prisma, audit);

    const result = await handler.handle(
      makeEvent('charge.dispute.funds_reinstated', { id: 'dp_1' }),
    );

    expect(result.success).toBe(true);
    expect(audit.record).toHaveBeenCalledWith('usr_1', 'DISPUTE_FUNDS_REINSTATED', {
      dispute_id: 'dsp_1',
      stripe_dispute_id: 'dp_1',
      amount: 100,
      currency: 'IDR',
      booking_code: 'BOK-1',
      source: 'stripe_webhook',
    });
  });
});

// ── RefundFailedHandler ──────────────────────────────────────

describe('RefundFailedHandler', () => {
  it('should be registered for refund.failed and delegate to RefundUpdatedHandler', async () => {
    const prisma = makePrismaMock();
    const notifications = makeNotificationsMock();
    prisma.t_trx_refunds.updateMany.mockResolvedValue({ count: 1 });
    prisma.t_trx_payments.updateMany.mockResolvedValue({ count: 1 });
    prisma.t_trx_refunds.findUnique = jest.fn().mockResolvedValue({
      id: 'ref_1',
      stripe_refund_id: 're_1',
      status: 'PROCESSING',
      payment_id: 'pay_1',
      booking_id: 'bk_1',
      requested_by: 'usr_1',
      amount: 50,
      currency: 'IDR',
      completed_at: null,
      failure_reason: null,
      requester: { id: 'usr_1', name: 'A', email: 'a@b.c' },
      booking: { id: 'bk_1', booking_code: 'BOK-1', event: { title: 'Concert' } },
    });
    const underlying = new RefundUpdatedHandler(prisma, notifications);
    const handler = new RefundFailedHandler(underlying);

    expect(handler.eventType).toBe('refund.failed');
    const result = await handler.handle(
      makeEvent('refund.failed', { id: 're_1', status: 'failed' }),
    );

    expect(result.success).toBe(true);
    expect(notifications.sendRefundStatus).toHaveBeenCalledWith(
      'a@b.c',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });
});

// ── Radar fraud / review handlers ────────────────────────────

const radarPayment = {
  id: 'pay_1',
  booking: { user_id: 'usr_1', booking_code: 'BOK-1' },
};

describe('EarlyFraudWarningHandler', () => {
  let handler: EarlyFraudWarningHandler;
  let prisma: ReturnType<typeof makePrismaMock>;
  let audit: ReturnType<typeof makeAuditMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    prisma.t_trx_payments.findFirst.mockResolvedValue(radarPayment);
    audit = makeAuditMock();
    handler = new EarlyFraudWarningHandler(prisma, audit);
  });

  it('should be registered for radar.early_fraud_warning.created', () => {
    expect(handler.eventType).toBe('radar.early_fraud_warning.created');
  });

  it('should record a FRAUD_EARLY_WARNING audit entry', async () => {
    const result = await handler.handle(
      makeEvent('radar.early_fraud_warning.created', {
        id: 'issfr_1',
        charge: 'ch_1',
        payment_intent: 'pi_1',
        fraud_type: 'made_with_stolen_card',
        actionable: true,
      }),
    );

    expect(result.success).toBe(true);
    expect(audit.record).toHaveBeenCalledWith('usr_1', 'FRAUD_EARLY_WARNING', {
      early_fraud_warning_id: 'issfr_1',
      payment_id: 'pay_1',
      booking_code: 'BOK-1',
      fraud_type: 'made_with_stolen_card',
      actionable: true,
      source: 'stripe_webhook',
    });
  });

  it('should skip when the warning carries no payment identifiers', async () => {
    const result = await handler.handle(
      makeEvent('radar.early_fraud_warning.created', { id: 'issfr_2' }),
    );

    expect(result.skipped).toBe(true);
    expect(prisma.t_trx_payments.findFirst).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('should skip when no local payment matches', async () => {
    prisma.t_trx_payments.findFirst.mockResolvedValue(null);
    const result = await handler.handle(
      makeEvent('radar.early_fraud_warning.created', { id: 'issfr_3', charge: 'ch_x' }),
    );

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('should return failure when the audit write throws', async () => {
    audit.record.mockRejectedValue(new Error('db down'));
    const result = await handler.handle(
      makeEvent('radar.early_fraud_warning.created', { id: 'issfr_4', charge: 'ch_1' }),
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('issfr_4');
  });
});

describe('Review handlers', () => {
  it('should record PAYMENT_REVIEW_OPENED for review.opened', async () => {
    const prisma = makePrismaMock();
    prisma.t_trx_payments.findFirst.mockResolvedValue(radarPayment);
    const audit = makeAuditMock();
    const handler = new ReviewOpenedHandler(prisma, audit);

    expect(handler.eventType).toBe('review.opened');
    const result = await handler.handle(
      makeEvent('review.opened', { id: 'prv_1', charge: 'ch_1', reason: 'rule' }),
    );

    expect(result.success).toBe(true);
    expect(audit.record).toHaveBeenCalledWith('usr_1', 'PAYMENT_REVIEW_OPENED', {
      review_id: 'prv_1',
      payment_id: 'pay_1',
      booking_code: 'BOK-1',
      reason: 'rule',
      closed_reason: null,
      source: 'stripe_webhook',
    });
  });

  it('should record PAYMENT_REVIEW_CLOSED with the closed reason', async () => {
    const prisma = makePrismaMock();
    prisma.t_trx_payments.findFirst.mockResolvedValue(radarPayment);
    const audit = makeAuditMock();
    const handler = new ReviewClosedHandler(prisma, audit);

    expect(handler.eventType).toBe('review.closed');
    const result = await handler.handle(
      makeEvent('review.closed', {
        id: 'prv_2',
        payment_intent: 'pi_1',
        reason: 'approved',
        closed_reason: 'approved',
      }),
    );

    expect(result.success).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(
      'usr_1',
      'PAYMENT_REVIEW_CLOSED',
      expect.objectContaining({ review_id: 'prv_2', closed_reason: 'approved' }),
    );
  });

  it('should skip when no local payment matches', async () => {
    const prisma = makePrismaMock();
    prisma.t_trx_payments.findFirst.mockResolvedValue(null);
    const audit = makeAuditMock();
    const handler = new ReviewOpenedHandler(prisma, audit);

    const result = await handler.handle(
      makeEvent('review.opened', { id: 'prv_3', charge: 'ch_x' }),
    );

    expect(result.skipped).toBe(true);
    expect(audit.record).not.toHaveBeenCalled();
  });
});

// ── Contract: every handler implements the interface ─────────

describe('Handler interface contract', () => {
  const handlers: IWebhookEventHandler[] = [
    new CheckoutCompletedHandler(makePaymentsMock()),
    new CheckoutExpiredHandler(),
    new PaymentFailedHandler(makePrismaMock()),
    new PaymentIntentSucceededHandler(
      { listCheckoutSessions: jest.fn().mockResolvedValue({ data: [] }) } as never,
      makePaymentsMock(),
    ),
    new ChargeRefundedHandler(makePrismaMock(), makeAuditMock()),
    new DisputeCreatedHandler(makePrismaMock(), {
      opened: jest.fn().mockResolvedValue({}),
    } as never),
    new AsyncPaymentFailedHandler(makePrismaMock()),
    new DisputeFundsWithdrawnHandler(makePrismaMock(), makeAuditMock()),
    new DisputeFundsReinstatedHandler(makePrismaMock(), makeAuditMock()),
    new EarlyFraudWarningHandler(makePrismaMock(), makeAuditMock()),
    new ReviewOpenedHandler(makePrismaMock(), makeAuditMock()),
    new ReviewClosedHandler(makePrismaMock(), makeAuditMock()),
  ];

  it.each(handlers.map((h) => [h.constructor.name, h]))(
    '%s should expose an eventType and a handle() method returning a WebhookHandlerResult-shaped promise',
    async (_name, handler) => {
      expect(typeof handler.eventType).toBe('string');
      expect(handler.eventType.length).toBeGreaterThan(0);
      expect(typeof handler.handle).toBe('function');

      const result: WebhookHandlerResult = await handler.handle(
        makeEvent(handler.eventType, { id: 'obj_x' }),
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    },
  );
});
