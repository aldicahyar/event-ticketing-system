import { NotFoundException } from '@nestjs/common';
import { InvoiceService, formatJakartaDate } from './invoice.service';
import { PrismaService } from '../../common/database/prisma.service';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let prisma: { t_trx_bookings: { findFirst: jest.Mock } };

  beforeEach(() => {
    prisma = {
      t_trx_bookings: {
        findFirst: jest.fn(),
      },
    };
    service = new InvoiceService(prisma as unknown as PrismaService);
  });

  describe('formatJakartaDate', () => {
    it('renders a UTC instant in WIB (+7) with a WIB suffix', () => {
      // 09:00 UTC → 16:00 WIB. Guards against the toISOString() UTC bug.
      expect(formatJakartaDate(new Date('2026-08-11T09:00:00Z'))).toBe('11 Aug 2026 16:00 WIB');
    });

    it('omits the time and suffix when includeTime is false', () => {
      expect(formatJakartaDate(new Date('2026-08-11T20:00:00Z'), false)).toBe('12 Aug 2026');
    });
  });

  describe('computeTotals', () => {
    it('calculates subtotal, tax, and total correctly', () => {
      const result = service.computeTotals([100000, 100000], 222000);
      expect(result).toEqual({
        subtotal: 200000,
        tax: 22000,
        total: 222000,
      });
    });

    it('returns tax = 0 when total equals subtotal', () => {
      const result = service.computeTotals([50000], 50000);
      expect(result).toEqual({
        subtotal: 50000,
        tax: 0,
        total: 50000,
      });
    });

    it('handles decimal rounding cleanly', () => {
      const result = service.computeTotals([10.55, 20.45], 34.43);
      expect(result).toEqual({
        subtotal: 31,
        tax: 3.43,
        total: 34.43,
      });
    });
  });

  describe('generateInvoice', () => {
    const mockBooking = {
      id: 'book-1',
      booking_code: 'BK-123',
      total_price: 222000,
      currency: 'IDR',
      status: 'CONFIRMED',
      booked_at: new Date('2026-08-30T10:00:00Z'),
      user: { name: 'John Doe', email: 'john@example.com' },
      event: {
        title: 'Tech Fest 2026',
        start_date_time: new Date('2026-09-15T09:00:00Z'),
        venue: { name: 'Convention Center', city: 'Jakarta', address: 'Jl. Sudirman 1' },
        organizer: { name: 'Organizer Inc' },
      },
      seats: [
        { row: 'A', number: 1, type: 'VIP', price: 100000 },
        { row: 'A', number: 2, type: 'VIP', price: 100000 },
      ],
      payment: {
        provider: 'STRIPE',
        status: 'PAID',
        paid_at: new Date('2026-08-30T10:05:00Z'),
        provider_tx_id: 'pi_test_123',
      },
    };

    it('generates a valid PDF buffer and filename for booking owner', async () => {
      prisma.t_trx_bookings.findFirst.mockResolvedValue(mockBooking);

      const result = await service.generateInvoice('book-1', { id: 'usr-1', role: 'CUSTOMER' });

      expect(prisma.t_trx_bookings.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'book-1', user_id: 'usr-1' },
        }),
      );
      expect(result.filename).toBe('INV-BK-123.pdf');
      expect(Buffer.isBuffer(result.pdf)).toBe(true);
      expect(result.pdf.length).toBeGreaterThan(0);
      expect(result.pdf.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('allows ADMIN to fetch invoice without user_id filter', async () => {
      prisma.t_trx_bookings.findFirst.mockResolvedValue(mockBooking);

      const result = await service.generateInvoice('book-1', { id: 'admin-1', role: 'ADMIN' });

      expect(prisma.t_trx_bookings.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'book-1' },
        }),
      );
      expect(result.filename).toBe('INV-BK-123.pdf');
    });

    it('paginates without crashing when seats overflow one page', async () => {
      const seats = Array.from({ length: 60 }, (_, i) => ({
        row: 'A',
        number: i + 1,
        type: 'REGULAR',
        price: 100000,
      }));
      prisma.t_trx_bookings.findFirst.mockResolvedValue({ ...mockBooking, seats });

      const result = await service.generateInvoice('book-1', { id: 'usr-1', role: 'CUSTOMER' });

      expect(result.pdf.subarray(0, 4).toString()).toBe('%PDF');
      expect(result.pdf.length).toBeGreaterThan(0);
    });

    it('renders when no payment record exists yet', async () => {
      prisma.t_trx_bookings.findFirst.mockResolvedValue({ ...mockBooking, payment: null });

      const result = await service.generateInvoice('book-1', { id: 'usr-1', role: 'CUSTOMER' });

      expect(result.pdf.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('throws NotFoundException if booking does not exist or user lacks access', async () => {
      prisma.t_trx_bookings.findFirst.mockResolvedValue(null);

      await expect(
        service.generateInvoice('book-unknown', { id: 'usr-2', role: 'CUSTOMER' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
