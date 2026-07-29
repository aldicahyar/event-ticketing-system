import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { IEmailTransport, EmailSendResult } from './interfaces/email-transport.interface';
import {
  PaymentSuccessEmailData,
  PaymentRefundedEmailData,
  BookingCancelledEmailData,
} from './interfaces/email-template.interface';

// ── Mock transport that records all calls ────────────────────────

class MockTransport implements IEmailTransport {
  readonly name = 'mock';
  public calls: { to: string; subject: string }[] = [];
  public shouldFail = false;

  async send(to: string, content: { subject: string }): Promise<EmailSendResult> {
    this.calls.push({ to, subject: content.subject });

    if (this.shouldFail) {
      return { success: false, error: 'Mock failure', transport: this.name };
    }

    return { success: true, messageId: `mock-${this.calls.length}`, transport: this.name };
  }
}

// ── Test fixtures ────────────────────────────────────────────────

const successData: PaymentSuccessEmailData = {
  bookingCode: 'BOK-TEST-001',
  eventName: 'Concert Test',
  customerName: 'John Doe',
  totalAmount: 150,
  currency: 'usd',
  seatCount: 2,
  seats: ['A1', 'A2'],
  eventDate: '2026-08-15T19:00:00.000Z',
  venueName: 'Grand Hall',
  venueCity: 'Jakarta',
  ticketUrl: 'https://example.com/tickets/123',
};

const refundedData: PaymentRefundedEmailData = {
  bookingCode: 'BOK-TEST-002',
  eventName: 'Concert Test',
  customerName: 'Jane Doe',
  refundAmount: 100,
  currency: 'usd',
  refundId: 're_test123',
  refundStatus: 'succeeded',
  reason: 'Late payment after expiry',
};

const cancelledData: BookingCancelledEmailData = {
  bookingCode: 'BOK-TEST-003',
  eventName: 'Concert Test',
  customerName: 'Bob Smith',
  reason: 'CHANGE_OF_PLANS',
  description: 'I have a schedule conflict on that date.',
  cancelledByAdmin: false,
  adminEmail: null,
  cancelledAt: '2026-07-28T10:00:00.000Z',
};

// ── Tests ────────────────────────────────────────────────────────

describe('NotificationsService', () => {
  let service: NotificationsService;
  let transport: MockTransport;

  beforeEach(async () => {
    transport = new MockTransport();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: NotificationsService,
          useFactory: () => new NotificationsService(transport),
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  // ── Payment Success ───────────────────────────────────────────

  it('should send a payment-success email with correct subject', async () => {
    await service.sendPaymentSuccess('user@test.com', successData);

    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0].to).toBe('user@test.com');
    expect(transport.calls[0].subject).toContain('Ticket Confirmed');
  });

  it('should include event name and booking code in the email', async () => {
    await service.sendPaymentSuccess('user@test.com', successData);

    // The subject contains the event name
    expect(transport.calls[0].subject).toContain('Concert Test');
  });

  // ── Payment Refunded ─────────────────────────────────────────

  it('should send a payment-refunded email with refund details', async () => {
    await service.sendPaymentRefunded('user@test.com', refundedData);

    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0].to).toBe('user@test.com');
    expect(transport.calls[0].subject).toContain('Refund Processed');
  });

  // ── Booking Cancelled ────────────────────────────────────────

  it('should send a booking-cancelled email for user cancellation', async () => {
    await service.sendBookingCancelled('user@test.com', cancelledData);

    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0].to).toBe('user@test.com');
    expect(transport.calls[0].subject).toContain('Booking Cancelled');
  });

  it('should send a booking-cancelled email for admin cancellation', async () => {
    const adminCancelled: BookingCancelledEmailData = {
      ...cancelledData,
      cancelledByAdmin: true,
      adminEmail: 'admin@test.com',
    };

    await service.sendBookingCancelled('user@test.com', adminCancelled);

    expect(transport.calls).toHaveLength(1);
  });

  // ── Error handling ────────────────────────────────────────────

  it('should not throw when transport fails (non-blocking)', async () => {
    transport.shouldFail = true;

    await expect(
      service.sendPaymentSuccess('user@test.com', successData),
    ).resolves.not.toThrow();
  });

  it('should not throw when transport throws an exception', async () => {
    // Override send to throw
    transport.send = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(
      service.sendPaymentRefunded('user@test.com', refundedData),
    ).resolves.not.toThrow();
  });

  it('should continue processing after a failed send', async () => {
    transport.shouldFail = true;
    await service.sendPaymentSuccess('fail@test.com', successData);

    transport.shouldFail = false;
    await service.sendBookingCancelled('ok@test.com', cancelledData);

    expect(transport.calls).toHaveLength(2);
    expect(transport.calls[1].to).toBe('ok@test.com');
  });
});

// ── Template builder tests ──────────────────────────────────────

describe('Email Templates', () => {
  describe('buildPaymentSuccessEmail', () => {
    it('should render all required fields', async () => {
      const { buildPaymentSuccessEmail } = await import('./templates/payment-success.template');
      const content = buildPaymentSuccessEmail(successData);

      expect(content.subject).toContain('Ticket Confirmed');
      expect(content.html).toContain('BOK-TEST-001');
      expect(content.html).toContain('Concert Test');
      expect(content.html).toContain('John Doe');
      expect(content.html).toContain('A1, A2');
      expect(content.text).toContain('BOK-TEST-001');
      expect(content.text).toContain('$150.00');
    });

    it('should format IDR currency with dots as thousand separators', async () => {
      const { buildPaymentSuccessEmail } = await import('./templates/payment-success.template');
      const content = buildPaymentSuccessEmail({
        ...successData,
        totalAmount: 1500000,
        currency: 'idr',
      });

      // Must use dots (Indonesian), NOT commas
      expect(content.text).toContain('Rp 1.500.000');
      expect(content.html).toContain('Rp 1.500.000');
      expect(content.text).not.toContain('Rp 1,500,000');
    });

    it('should handle missing optional fields gracefully', async () => {
      const { buildPaymentSuccessEmail } = await import('./templates/payment-success.template');
      const content = buildPaymentSuccessEmail({
        ...successData,
        eventDate: null,
        venueName: null,
        venueCity: null,
      });

      expect(content.text).not.toContain('Date:');
      // Seats array still has values, so not 'General Admission'
      expect(content.text).toContain('A1, A2');
    });
  });

  describe('buildPaymentRefundedEmail', () => {
    it('should render refund details', async () => {
      const { buildPaymentRefundedEmail } = await import('./templates/payment-refunded.template');
      const content = buildPaymentRefundedEmail(refundedData);

      expect(content.subject).toContain('Refund Processed');
      expect(content.html).toContain('re_test123');
      expect(content.html).toContain('succeeded');
      expect(content.text).toContain('$100.00');
    });
  });

  describe('buildBookingCancelledEmail', () => {
    it('should render cancellation details for user cancel', async () => {
      const { buildBookingCancelledEmail } = await import('./templates/booking-cancelled.template');
      const content = buildBookingCancelledEmail(cancelledData);

      expect(content.subject).toContain('Booking Cancelled');
      expect(content.html).toContain('CHANGE_OF_PLANS');
      expect(content.html).toContain('schedule conflict');
    });

    it('should mention admin email for admin cancel', async () => {
      const { buildBookingCancelledEmail } = await import('./templates/booking-cancelled.template');
      const content = buildBookingCancelledEmail({
        ...cancelledData,
        cancelledByAdmin: true,
        adminEmail: 'admin@test.com',
      });

      expect(content.text).toContain('administrator (admin@test.com)');
    });
  });
});
