import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../common/database/prisma.service';
import { formatCurrency } from '../../common/utils/currency.utils';
import type { Prisma } from '@prisma/client';

const BRAND = 'Event Ticketing System';
const PAGE_MARGIN = 48;

export type InvoiceRequester = { id: string; role: string };
type InvoiceTotals = { subtotal: number; tax: number; total: number };

const INCLUDE = {
  user: { select: { name: true, email: true } },
  event: {
    select: {
      title: true,
      start_date_time: true,
      venue: { select: { name: true, city: true, address: true } },
      organizer: { select: { name: true } },
    },
  },
  seats: { orderBy: [{ row: 'asc' }, { number: 'asc' }] },
  payment: true,
} as const satisfies Prisma.t_trx_bookingsInclude;

export type BookingForInvoice = Prisma.t_trx_bookingsGetPayload<{ include: typeof INCLUDE }>;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Subtotal/tax are not persisted at checkout. Derived from seat prices + total.
   *  TODO: move to stored subtotal/tax_amount columns when multi-region tax (GAP-15) lands. */
  computeTotals(seatPrices: number[], totalPrice: number): InvoiceTotals {
    const subtotal = round2(seatPrices.reduce((sum, price) => sum + price, 0));
    const total = round2(totalPrice);
    return { subtotal, tax: Math.max(0, round2(total - subtotal)), total };
  }

  async generateInvoice(
    bookingId: string,
    requester: InvoiceRequester,
  ): Promise<{ filename: string; pdf: Buffer }> {
    const booking = await this.prisma.t_trx_bookings.findFirst({
      where: {
        id: bookingId,
        // ADMIN can pull any invoice for support; others only their own.
        ...(requester.role === 'ADMIN' ? {} : { user_id: requester.id }),
      },
      include: INCLUDE,
    });

    if (!booking) {
      throw new NotFoundException(`Order with ID ${bookingId} not found`);
    }

    const pdf = await this.render(
      booking,
      this.computeTotals(
        booking.seats.map((s) => Number(s.price)),
        Number(booking.total_price),
      ),
    );
    return { filename: `INV-${booking.booking_code}.pdf`, pdf };
  }

  private render(booking: BookingForInvoice, totals: InvoiceTotals): Promise<Buffer> {
    const currency = booking.currency;
    const money = (value: number) => formatCurrency(value, currency);
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const right = doc.page.width - PAGE_MARGIN;
    const contentWidth = right - PAGE_MARGIN;

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(BRAND, PAGE_MARGIN, PAGE_MARGIN);
    doc.fontSize(18).text('INVOICE', PAGE_MARGIN, PAGE_MARGIN, { align: 'right' });
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`Organizer: ${booking.event.organizer?.name ?? BRAND}`);
    doc.moveDown(0.6);
    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(right, doc.y)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(1);

    // Bill-to + invoice meta side-by-side
    const metaLeft = PAGE_MARGIN + contentWidth / 2;
    const infoTop = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').text('BILL TO', PAGE_MARGIN, infoTop);
    doc.font('Helvetica').text(booking.user.name).text(booking.user.email);

    doc.font('Helvetica-Bold').text('INVOICE #', metaLeft, infoTop);
    doc
      .font('Helvetica')
      .text(`INV-${booking.booking_code}`, metaLeft)
      .text(`Order date: ${booking.booked_at.toISOString().slice(0, 10)}`, metaLeft)
      .text(`Status: ${booking.status}`, metaLeft);

    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(9).text('EVENT', PAGE_MARGIN, doc.y);
    doc
      .font('Helvetica')
      .text(booking.event.title)
      .text(booking.event.start_date_time.toISOString().replace('T', ' ').slice(0, 16))
      .text(
        [booking.event.venue.name, booking.event.venue.city, booking.event.venue.address]
          .filter(Boolean)
          .join(', '),
      );

    // Seat table
    doc.moveDown(1.2);
    const cols = [PAGE_MARGIN, PAGE_MARGIN + 110, PAGE_MARGIN + 230, PAGE_MARGIN + 320];
    const amountWidth = right - cols[3];

    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('SEAT', cols[0], doc.y, { continued: true });
    doc.text('TYPE', cols[1], doc.y, { continued: true });
    doc.text('UNIT PRICE', cols[2], doc.y, { continued: true });
    doc.text('AMOUNT', cols[3], doc.y, { width: amountWidth, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(PAGE_MARGIN, doc.y).lineTo(right, doc.y).stroke();
    doc.moveDown(0.4);

    doc.font('Helvetica');
    for (const seat of booking.seats) {
      const price = Number(seat.price);
      const row = doc.y;
      doc.text(`${seat.row}-${seat.number}`, cols[0], row);
      doc.text(seat.type, cols[1], row);
      doc.text(money(price), cols[2], row);
      doc.text(money(price), cols[3], row, { width: amountWidth, align: 'right' });
      doc.moveDown(0.2);
    }

    // Totals
    doc.moveDown(0.6);
    doc.moveTo(cols[2], doc.y).lineTo(right, doc.y).stroke();
    doc.moveDown(0.4);

    const totalRow = (label: string, value: number, bold = false) => {
      const row = doc.y;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(label, cols[2], row);
      doc.text(money(value), cols[3], row, { width: amountWidth, align: 'right' });
      doc.moveDown(0.3);
    };
    totalRow('Subtotal', totals.subtotal);
    totalRow('Tax (PPN)', totals.tax);
    totalRow('Total', totals.total, true);

    // Footer
    doc.moveDown(1.5);
    doc.font('Helvetica').fontSize(8).fillColor('#555555');
    if (booking.payment) {
      const paidAt = booking.payment.paid_at
        ? booking.payment.paid_at.toISOString().slice(0, 10)
        : 'unpaid';
      doc.text(
        `Payment: ${booking.payment.provider} | ${booking.payment.status} | ${paidAt}` +
          (booking.payment.provider_tx_id ? ` | ref ${booking.payment.provider_tx_id}` : ''),
        PAGE_MARGIN, doc.y,
      );
    }
    doc.text('Thank you for your purchase.', PAGE_MARGIN, doc.y);

    doc.end();
    return done;
  }
}
