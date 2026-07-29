import { EmailContent, PaymentRefundedEmailData } from '../interfaces/email-template.interface';

/**
 * Formats a numeric amount with its currency code into a human-readable string.
 */
function formatCurrency(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  if (code === 'IDR') {
    const rounded = Math.round(amount);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp ${formatted}`;
  }
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}

/**
 * Renders the payment-refunded email.
 *
 * Sent when a payment arrives after the booking's 15-minute reservation
 * window expired. The system automatically refunds the charge via Stripe
 * and the user is notified that they need to place a new booking.
 */
export function buildPaymentRefundedEmail(
  data: PaymentRefundedEmailData,
): EmailContent {
  const { bookingCode, eventName, customerName, refundAmount, currency, refundId, refundStatus, reason } = data;
  const formattedAmount = formatCurrency(refundAmount, currency);

  const subject = `Refund Processed — ${eventName}`;

  const text = [
    `REFUND PROCESSED`,
    ``,
    `Hello ${customerName},`,
    ``,
    `Your payment for booking ${bookingCode} (${eventName}) was received after`,
    `the 15-minute reservation window expired. Your seats were released and`,
    `the payment has been automatically refunded.`,
    ``,
    `Refund details:`,
    `  Amount:   ${formattedAmount}`,
    `  Refund ID: ${refundId ?? 'N/A'}`,
    `  Status:   ${refundStatus}`,
    `  Reason:   ${reason}`,
    ``,
    `Refunds typically appear on your statement within 5-10 business days.`,
    `If you still wish to attend the event, please place a new booking.`,
    ``,
    `We apologize for the inconvenience.`,
    ``,
    `EventTix Team`,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr><td style="padding:20px 12px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#92400e 0%,#b45309 100%);padding:32px 40px;text-align:center;">
            <h1 style="margin:0 0 4px;color:#ffffff;font-size:24px;font-weight:700;">Refund Processed</h1>
            <p style="margin:0;color:#fde68a;font-size:13px;">Your payment has been refunded</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 8px;">
            <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;">
              Hello <strong>${customerName}</strong>,
            </p>
            <p style="margin:0 0 28px;color:#334155;font-size:15px;line-height:1.6;">
              Your payment for booking <strong>${bookingCode}</strong> (${eventName}) was received after the 15-minute reservation window expired. Your seats were released and the payment has been automatically refunded.
            </p>

            <!-- Refund details card -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fefbdf;border:1px solid #fde68a;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;color:#92400e;font-size:13px;width:110px;vertical-align:top;">Amount</td>
                    <td style="padding:6px 0;color:#0f172a;font-size:18px;font-weight:700;">${formattedAmount}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#92400e;font-size:13px;vertical-align:top;">Refund ID</td>
                    <td style="padding:6px 0;color:#0f172a;font-size:14px;font-family:monospace;">${refundId ?? 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#92400e;font-size:13px;vertical-align:top;">Status</td>
                    <td style="padding:6px 0;color:#0f172a;font-size:14px;">${refundStatus}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#92400e;font-size:13px;vertical-align:top;">Reason</td>
                    <td style="padding:6px 0;color:#0f172a;font-size:14px;">${reason}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.6;">
              Refunds typically appear on your statement within <strong>5-10 business days</strong>.
              If you still wish to attend, please place a new booking.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
              Need help? Reply to this email or visit our support page.<br>
              &copy; ${new Date().getFullYear()} EventTix. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
