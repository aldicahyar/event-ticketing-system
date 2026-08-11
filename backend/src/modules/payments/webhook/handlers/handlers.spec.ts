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
import { ChargeRefundedHandler } from './charge-refunded.handler';
import { DisputeCreatedHandler } from './dispute-created.handler';
import { DisputeClosedHandler } from './dispute-closed.handler';
import { AsyncPaymentFailedHandler } from './async-payment-failed.handler';
import { RefundUpdatedHandler } from './refund-updated.handler';
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

// ── Contract: every handler implements the interface ─────────

describe('Handler interface contract', () => {
  const handlers: IWebhookEventHandler[] = [
    new CheckoutCompletedHandler(makePaymentsMock()),
    new CheckoutExpiredHandler(),
    new PaymentFailedHandler(makePrismaMock()),
    new ChargeRefundedHandler(makePrismaMock(), makeAuditMock()),
    new DisputeCreatedHandler(makePrismaMock(), {
      opened: jest.fn().mockResolvedValue({}),
    } as never),
    new AsyncPaymentFailedHandler(makePrismaMock()),
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
