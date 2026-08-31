import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../common/database/prisma.service';
import { formatCurrency } from '../../common/utils/currency.utils';
import type { Prisma } from '@prisma/client';

const BRAND = 'EVENTTICKET.';
const PAGE_MARGIN = 48;
const PAGE_BOTTOM = 60;

// Print-safe brand palette. Monochromatic slate so hierarchy comes from
// contrast, not decoration — stays legible on B/W printers and matches the
// platform's brutalist brand (no gradients/glow, per design guidelines).
const C = {
  primary: '#0a0a0a',  // deep black — brand, header, badge
  text:    '#2d2d2d',  // body copy
  muted:   '#6b7280',  // section labels, secondary
  fainter: '#9ca3af',  // page footer, disclaimer
  line:    '#d1d5db',  // soft separators
  lineStrong: '#9ca3af', // total separators
  surface: '#f3f4f6',  // table header / total box tint
  solid:   '#1c1c1c',  // near-black total box background
  white:   '#ffffff',
};

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

/** Renders in Asia/Jakarta with an explicit WIB suffix. Using toISOString() here
 *  previously printed UTC, so an 09:00 WIB event showed as 02:00 on the invoice. */
export function formatJakartaDate(value: Date, includeTime = true): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  })
    .format(value)
    .replace(',', '') + (includeTime ? ' WIB' : '');
}

function paymentLabel(status: string): string {
  return status === 'COMPLETED' ? 'PAID' : status;
}

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Subtotal/tax are not persisted at checkout. Derived from seat prices + total.
   * TODO: move to stored subtotal/tax_amount columns when multi-region tax (GAP-15) lands. */
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
    // Issuer defaults to the platform brand, not the per-event organizer, so the
    // invoice is always printed under the platform's identity. Override via env.
    const issuerName = process.env.INVOICE_ISSUER_NAME || BRAND;
    const issuerAddress = process.env.INVOICE_ISSUER_ADDRESS;
    const issuerNpwp = process.env.INVOICE_ISSUER_NPWP;
    const taxRate = totals.subtotal > 0 ? Math.round((totals.tax / totals.subtotal) * 100) : 0;
    const paidStatus = booking.payment ? paymentLabel(booking.payment.status) : 'UNPAID';

    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];
    const right = doc.page.width - PAGE_MARGIN;
    const contentWidth = right - PAGE_MARGIN;
    // Right-aligned metadata column starts mid-page; line items keep 4 clean columns.
    const metaLeft = PAGE_MARGIN + contentWidth / 2;
    const cols = [PAGE_MARGIN, PAGE_MARGIN + 105, PAGE_MARGIN + 255, PAGE_MARGIN + 355];
    const amountWidth = right - cols[3];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // Label helper: small, spaced, uppercase monospace — the only place Courier
    // earns its keep (labels), so financial data uses Helvetica (legible).
    const label = (text: string, x: number, y: number) => {
      doc.font('Courier-Bold').fontSize(7.5).fillColor(C.muted)
        .text(text, x, y, { characterSpacing: 1.2 });
    };
    const sectionRule = (y: number) => {
      doc.moveTo(PAGE_MARGIN, y).lineTo(right, y).strokeColor(C.line).lineWidth(0.6).stroke();
    };
    const gl = (y: number) => {
      doc.moveTo(PAGE_MARGIN, y).lineTo(right, y).strokeColor(C.line).lineWidth(0.6).stroke();
    };

    const tableHeader = () => {
      const row = doc.y;
      const headerH = 18;
      doc.rect(PAGE_MARGIN, row, contentWidth, headerH).fill(C.surface);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.primary);
      const mid = row + (headerH / 2) - 3;
      doc.text('SEAT', cols[0], mid);
      doc.text('TYPE', cols[1], mid);
      doc.text('UNIT PRICE', cols[2], mid, { width: 100, align: 'right' });
      doc.text('AMOUNT', cols[3], mid, { width: amountWidth, align: 'right' });
      doc.y = row + headerH;
      doc.moveDown(0.1);
    };
    const ensureSeatSpace = () => {
      if (doc.y + 34 <= doc.page.height - PAGE_BOTTOM) return;
      doc.addPage();
      label('INVOICE ITEMS (CONTINUED)', PAGE_MARGIN, PAGE_MARGIN);
      doc.moveDown(0.6);
      tableHeader();
    };

    // ── Branded header ───────────────────────────────────────────────
    const headerH = 64;
    doc.rect(PAGE_MARGIN, PAGE_MARGIN, contentWidth, headerH).fill(C.primary);
    // Geometric brand mark (solid square + brand name). Print-safe, no external asset.
    doc.rect(PAGE_MARGIN + 16, PAGE_MARGIN + 24, 12, 12).fill(C.white);
    doc.font('Helvetica-Bold').fontSize(21).fillColor(C.white)
      .text(BRAND, PAGE_MARGIN + 38, PAGE_MARGIN + 19);
    // Status badge sits in the header bar (right), so payment state is read
    // at a glance and never floats awkwardly in the metadata block.
    const badgeW = 66;
    const badgeH = 24;
    const badgeX = right - badgeW - 16;
    const badgeY = PAGE_MARGIN + (headerH - badgeH) / 2;
    if (paidStatus === 'PAID') {
      // Inverted badge: white outline + white text on the black bar.
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2).strokeColor(C.white).lineWidth(1).stroke();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
        .text('PAID', badgeX, badgeY + 8, { width: badgeW, align: 'center' });
    } else {
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2).fill(C.solid);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
        .text(paidStatus, badgeX, badgeY + 8, { width: badgeW, align: 'center' });
    }
    doc.font('Helvetica').fontSize(10).fillColor(C.fainter)
      .text('INVOICE', PAGE_MARGIN, PAGE_MARGIN + 26, { width: badgeX - 64, align: 'right' });
    doc.y = PAGE_MARGIN + headerH + 20;

    // Thin secondary rule under the header for a clean seam.
    gl(PAGE_MARGIN + headerH + 10);

    // ── Issuer (left) & invoice meta (right) ─────────────────────────
    const metaTop = doc.y;
    label('ISSUED BY', PAGE_MARGIN, metaTop);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text)
      .text(issuerName, PAGE_MARGIN, metaTop + 14);
    doc.font('Helvetica').fontSize(8.5).fillColor(C.muted);
    if (issuerAddress) doc.text(issuerAddress, PAGE_MARGIN, doc.y, { width: metaLeft - PAGE_MARGIN - 20 });
    if (issuerNpwp) doc.text(`NPWP: ${issuerNpwp}`, PAGE_MARGIN, doc.y);

    label('INVOICE DETAILS', metaLeft, metaTop);
    doc.font('Courier').fontSize(8.5).fillColor(C.text)
      .text(`No.   INV-${booking.booking_code}`, metaLeft, metaTop + 14)
      .text(`Date   ${formatJakartaDate(booking.booked_at, false)}`, metaLeft)
      .text(`Cur.   ${currency.toUpperCase()}`, metaLeft);
    doc.y = metaTop + 62;
    doc.fillColor(C.primary);
    sectionRule(doc.y - 8);
    doc.moveDown(1.1);

    // ── Bill to (left) & event (right) ───────────────────────────────
    const infoTop = doc.y;
    label('BILL TO', PAGE_MARGIN, infoTop);
    doc.font('Helvetica').fontSize(9).fillColor(C.text)
      .text(booking.user.name, PAGE_MARGIN, infoTop + 14)
      .text(booking.user.email, PAGE_MARGIN);
    // Ticket count gives the buyer an instant, human summary.
    const count = booking.seats.length;
    doc.font('Helvetica').fontSize(8.5).fillColor(C.muted)
      .text(`${count} ${count === 1 ? 'ticket' : 'tickets'}`, PAGE_MARGIN, doc.y);

    label('EVENT', metaLeft, infoTop);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.text)
      .text(booking.event.title, metaLeft, infoTop + 14, { width: contentWidth / 2 });
    doc.font('Helvetica').fontSize(8.5).fillColor(C.muted)
      .text(formatJakartaDate(booking.event.start_date_time), metaLeft, doc.y, { width: contentWidth / 2 });
    const venue = [booking.event.venue.name, booking.event.venue.address, booking.event.venue.city]
      .filter(Boolean)
      .join('\n');
    doc.fillColor(C.muted).text(venue, metaLeft, doc.y, { width: contentWidth / 2, lineGap: 1 });
    doc.fillColor(C.text);
    doc.y = Math.max(doc.y, infoTop + 56) + 20;
    sectionRule(doc.y - 8);
    doc.moveDown(1.0);

    // ── Line items table ─────────────────────────────────────────────
    tableHeader();
    const rowH = 17;
    // Render each cell by explicit x/y so rows never collapse when the font
    // changes for the money columns — mixing text() cursor flow had rows
    // overlapping (only the first seat printed).
    for (let i = 0; i < booking.seats.length; i += 1) {
      ensureSeatSpace();
      const row = doc.y;
      const y = row + 3;
      if (i % 2 === 1) doc.rect(PAGE_MARGIN, row, contentWidth, rowH - 2).fill('#fafafa');
      const price = Number(booking.seats[i].price);
      doc.font('Helvetica').fontSize(9).fillColor(C.text);
      doc.text(`${booking.seats[i].row}-${booking.seats[i].number}`, cols[0], y, { lineBreak: false });
      doc.text(booking.seats[i].type, cols[1], y, { width: 120, lineBreak: false });
      doc.font('Courier').text(money(price), cols[2], y, { width: 100, align: 'right', lineBreak: false });
      doc.text(money(price), cols[3], y, { width: amountWidth, align: 'right', lineBreak: false });
      doc.y = row + rowH;
    }

    // ── Total block (near-black, white figures = primary statement) ──
    const totalH = 112;
    if (doc.y + totalH > doc.page.height - PAGE_BOTTOM) doc.addPage();
    doc.moveDown(0.7);
    const totalW = 240;
    const totalLeft = right - totalW;
    const totalTop = doc.y;
    doc.rect(totalLeft, totalTop, totalW, totalH).fill(C.solid);
    const tr = (labelText: string, value: number, y: number, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 14 : 9.5).fillColor(C.white);
      doc.text(labelText, totalLeft + 16, y);
      doc.font(bold ? 'Courier-Bold' : 'Courier').text(money(value), totalLeft + 16, y, {
        width: totalW - 32,
        align: 'right',
      });
    };
    tr('SUB-TOTAL', totals.subtotal, totalTop + 14);
    tr(`PPN ${taxRate}%`, totals.tax, totalTop + 32);
    // Double rule above grand total (invoice tradition, readable in B/W).
    const ruleY = totalTop + 50;
    doc.moveTo(totalLeft + 16, ruleY).lineTo(right - 16, ruleY).strokeColor(C.white).lineWidth(0.6).stroke();
    doc.moveTo(totalLeft + 16, ruleY + 2).lineTo(right - 16, ruleY + 2).strokeColor(C.white).lineWidth(0.6).stroke();
    tr('TOTAL', totals.total, totalTop + 62, true);
    doc.y = totalTop + totalH + 22;

    // ── Payment reconciliation ───────────────────────────────────────
    label('PAYMENT DETAILS', PAGE_MARGIN, doc.y);
    doc.moveDown(0.6);
    doc.font('Helvetica').fontSize(8.5).fillColor(C.text);
    if (booking.payment) {
      const paidAt = booking.payment.paid_at ? formatJakartaDate(booking.payment.paid_at) : 'Not paid';
      doc.text(`Method: ${booking.payment.provider}    Status: ${paymentLabel(booking.payment.status)}    Paid: ${paidAt}`);
      if (booking.payment.provider_tx_id)
        doc.font('Courier').fillColor(C.muted).text(`Transaction reference: ${booking.payment.provider_tx_id}`);
    } else {
      doc.text('Payment has not been recorded.');
    }
    doc.moveDown(1.1);
    gl(doc.y - 8);
    doc.moveDown(0.7);

    // ── Legal / compliance footer ────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.primary)
      .text('NOT A TAX INVOICE', PAGE_MARGIN, doc.y);
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
      .text('This document is a payment receipt and is not an official tax invoice.');
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(8.5).fillColor(C.text)
      .text('Thank you for your purchase. Please present your valid ticket for venue entry.');

    // ── Pagination footer (all pages) ────────────────────────────────
    const pages = doc.bufferedPageRange();
    for (let page = 0; page < pages.count; page += 1) {
      doc.switchToPage(page);
      doc.font('Courier').fontSize(7).fillColor(C.fainter).text(
        `INV-${booking.booking_code}   Page ${page + 1} of ${pages.count}`,
        PAGE_MARGIN,
        doc.page.height - 30,
        { width: contentWidth, align: 'right' },
      );
    }

    doc.end();
    return done;
  }
}
