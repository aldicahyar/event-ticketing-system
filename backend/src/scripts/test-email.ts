/**
 * Functional email test script.
 *
 * Sends all 3 notification email types via Gmail SMTP to verify:
 *   1. Emails are not flagged as spam
 *   2. Seat labels show as "A1, A2" format (not UUIDs)
 *   3. Currency displays correctly (IDR format: Rp 1.500.000)
 *   4. Professional responsive layout renders properly in email clients
 *
 * Usage:
 *   npx ts-node src/scripts/test-email.ts [recipient-email]
 *
 * If no recipient is provided, defaults to SMTP_USER (sends to self).
 *
 * To clean up after testing:
 *   Delete this file when no longer needed.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables FIRST before anything else
dotenv.config({ path: path.join(__dirname, '../../.env') });

import * as nodemailer from 'nodemailer';
import { buildPaymentSuccessEmail } from '../modules/notifications/templates/payment-success.template';
import { buildPaymentRefundedEmail } from '../modules/notifications/templates/payment-refunded.template';
import { buildBookingCancelledEmail } from '../modules/notifications/templates/booking-cancelled.template';

interface SendResult {
  type: string;
  success: boolean;
  subject: string;
  messageId?: string;
  error?: string;
}

async function sendTestEmail(
  transporter: nodemailer.Transporter,
  fromAddress: string,
  replyTo: string,
  to: string,
  type: string,
  subject: string,
  html: string,
  text: string,
  headers: Record<string, string>,
): Promise<SendResult> {
  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text,
      headers,
      replyTo,
      encoding: 'utf-8',
    });
    return { type, success: true, subject, messageId: info.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { type, success: false, subject, error: msg };
  }
}

async function main(): Promise<void> {
  const recipient = process.argv[2] || process.env.SMTP_USER || '';

  if (!recipient) {
    console.error('ERROR: No recipient email provided and SMTP_USER not set.');
    console.error('Usage: npx ts-node src/scripts/test-email.ts [recipient-email]');
    process.exit(1);
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.error('ERROR: SMTP_USER and SMTP_PASS must be set in backend/.env');
    process.exit(1);
  }

  // Create transporter with same config as NodemailerTransport
  const port = Number(process.env.SMTP_PORT || '587');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const fromName = process.env.SMTP_FROM_NAME || 'EventTix';
  const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;
  const fromAddress = `"${fromName}" <${fromEmail}>"`;

  console.log('========================================');
  console.log('  EMAIL FUNCTIONAL TEST');
  console.log('========================================');
  console.log(`SMTP Host:  ${process.env.SMTP_HOST}`);
  console.log(`SMTP Port:  ${process.env.SMTP_PORT}`);
  console.log(`From:       ${fromName} <${fromEmail}>`);
  console.log(`To:         ${recipient}`);
  console.log('========================================\n');

  // Anti-spam headers (same as NodemailerTransport)
  const antiSpamHeaders: Record<string, string> = {
    'X-Mailer': 'EventTix Notification System',
    'List-Unsubscribe': `<mailto:${smtpUser}?subject=Unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Priority': '3',
    'X-Auto-Response-Suppress': 'All',
  };

  // === TEST DATA (realistic Indonesian event scenario, IDR currency) ===
  const paymentSuccessData = {
    bookingCode: 'BOK-2026-0729-001',
    eventName: 'Konser Musik Jazz Nusantara 2026',
    customerName: 'Budi Santoso',
    totalAmount: 333000,
    currency: 'IDR',
    seatCount: 3,
    seats: ['A1', 'A2', 'A3'],
    eventDate: '2026-08-15T19:00:00+07:00',
    venueName: 'Gedung Konser Jakarta',
    venueCity: 'Jakarta',
    ticketUrl: 'http://localhost:3001/dashboard/orders',
  };

  const paymentRefundedData = {
    bookingCode: 'BOK-2026-0729-002',
    eventName: 'Konser Musik Jazz Nusantara 2026',
    customerName: 'Budi Santoso',
    refundAmount: 333000,
    currency: 'IDR',
    refundId: 're_TEST_1234567890',
    refundStatus: 'succeeded',
    reason: 'Payment received after 15-minute reservation window expired',
  };

  const bookingCancelledData = {
    bookingCode: 'BOK-2026-0729-003',
    eventName: 'Konser Musik Jazz Nusantara 2026',
    customerName: 'Budi Santoso',
    reason: 'Changed mind',
    description: 'Customer decided to cancel the booking.',
    cancelledByAdmin: false,
    adminEmail: null,
    cancelledAt: new Date().toISOString(),
  };

  const results: SendResult[] = [];

  // --- Test 1: Payment Success ---
  console.log('[1/3] Building & sending PAYMENT SUCCESS email...');
  {
    const content = buildPaymentSuccessEmail(paymentSuccessData);
    const result = await sendTestEmail(
      transporter,
      fromAddress,
      smtpUser,
      recipient,
      'PAYMENT_SUCCESS',
      content.subject,
      content.html,
      content.text,
      antiSpamHeaders,
    );
    logResult(result);
    results.push(result);
  }

  // Wait 2s between sends to avoid SMTP rate limiting
  await new Promise((r) => setTimeout(r, 2000));

  // --- Test 2: Payment Refunded ---
  console.log('\n[2/3] Building & sending PAYMENT REFUNDED email...');
  {
    const content = buildPaymentRefundedEmail(paymentRefundedData);
    const result = await sendTestEmail(
      transporter,
      fromAddress,
      smtpUser,
      recipient,
      'PAYMENT_REFUNDED',
      content.subject,
      content.html,
      content.text,
      antiSpamHeaders,
    );
    logResult(result);
    results.push(result);
  }

  await new Promise((r) => setTimeout(r, 2000));

  // --- Test 3: Booking Cancelled ---
  console.log('\n[3/3] Building & sending BOOKING CANCELLED email...');
  {
    const content = buildBookingCancelledEmail(bookingCancelledData);
    const result = await sendTestEmail(
      transporter,
      fromAddress,
      smtpUser,
      recipient,
      'BOOKING_CANCELLED',
      content.subject,
      content.html,
      content.text,
      antiSpamHeaders,
    );
    logResult(result);
    results.push(result);
  }

  // --- Summary ---
  console.log('\n========================================');
  console.log('  TEST SUMMARY');
  console.log('========================================');
  const passed = results.filter((r) => r.success).length;
  for (const r of results) {
    const icon = r.success ? 'PASS' : 'FAIL';
    console.log(`  [${icon}] ${r.type} — "${r.subject}"`);
  }
  console.log(`\n  ${passed}/${results.length} emails sent successfully.`);
  console.log(`  Check inbox (and spam folder) at: ${recipient}`);
  console.log('========================================\n');

  transporter.close();
  process.exit(passed === results.length ? 0 : 1);
}

function logResult(r: SendResult): void {
  if (r.success) {
    console.log(`  [PASS] Subject: "${r.subject}"`);
    console.log(`         Message ID: ${r.messageId}`);
  } else {
    console.log(`  [FAIL] Subject: "${r.subject}"`);
    console.log(`         Error: ${r.error}`);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
