import { EmailContent, BookingCancelledEmailData } from '../interfaces/email-template.interface';

/**
 * Renders the booking-cancelled email.
 *
 * Sent when a user or admin cancels a PENDING booking. Confirms that
 * seats have been released and no payment was processed.
 */
export function buildBookingCancelledEmail(data: BookingCancelledEmailData): EmailContent {
  const {
    bookingCode,
    eventName,
    customerName,
    reason,
    description,
    cancelledByAdmin,
    adminEmail,
    cancelledAt,
  } = data;

  const cancelledBy = cancelledByAdmin ? `an administrator (${adminEmail ?? 'admin'})` : 'you';

  const subject = `Booking Cancelled — ${eventName}`;

  const text = [
    `BOOKING CANCELLED`,
    ``,
    `Hello ${customerName},`,
    ``,
    `Your booking ${bookingCode} for "${eventName}" has been cancelled by ${cancelledBy}.`,
    ``,
    `Cancellation details:`,
    `  Reason:      ${reason}`,
    `  Details:     ${description}`,
    `  Cancelled at: ${new Date(cancelledAt).toLocaleString('en-US')}`,
    ``,
    `Your seats have been released back to the pool and no payment was processed.`,
    ``,
    `If you believe this is an error, please contact support.`,
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
          <td style="background:linear-gradient(135deg,#991b1b 0%,#b91c1c 100%);padding:32px 40px;text-align:center;">
            <h1 style="margin:0 0 4px;color:#ffffff;font-size:24px;font-weight:700;">Booking Cancelled</h1>
            <p style="margin:0;color:#fca5a5;font-size:13px;">Your booking has been cancelled</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 8px;">
            <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;">
              Hello <strong>${customerName}</strong>,
            </p>
            <p style="margin:0 0 28px;color:#334155;font-size:15px;line-height:1.6;">
              Your booking <strong>${bookingCode}</strong> for "${eventName}" has been cancelled by ${cancelledBy}.
            </p>

            <!-- Cancellation details card -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;color:#991b1b;font-size:13px;width:120px;vertical-align:top;">Reason</td>
                    <td style="padding:6px 0;color:#0f172a;font-size:14px;">${reason}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#991b1b;font-size:13px;vertical-align:top;">Details</td>
                    <td style="padding:6px 0;color:#0f172a;font-size:14px;">${description}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#991b1b;font-size:13px;vertical-align:top;">Cancelled at</td>
                    <td style="padding:6px 0;color:#0f172a;font-size:14px;">${new Date(cancelledAt).toLocaleString('en-US')}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
              Your seats have been released and <strong>no payment was processed</strong>.
              If you believe this is an error, please contact support.
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
