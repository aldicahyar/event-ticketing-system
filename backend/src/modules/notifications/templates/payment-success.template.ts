import { EmailContent, PaymentSuccessEmailData } from '../interfaces/email-template.interface';
import { formatCurrency } from '../../../common/utils/currency.utils';

/**
 * Formats an ISO date string into a human-readable date.
 */
function formatDate(isoDate: string | null): string | null {
  if (!isoDate) return null;
  try {
    return new Date(isoDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}

/**
 * Renders the payment-success email.
 *
 * Sent when a Stripe checkout.session.completed webhook confirms a booking.
 * Includes a link to view/download e-tickets.
 *
 * Design: responsive, professional, works on all major email clients.
 * Uses table-based layout for maximum email client compatibility.
 */
export function buildPaymentSuccessEmail(
  data: PaymentSuccessEmailData,
): EmailContent {
  const {
    bookingCode, eventName, customerName, totalAmount, currency,
    seats, eventDate, venueName, venueCity, ticketUrl,
  } = data;

  const seatList = seats.length > 0 ? seats.join(', ') : 'General Admission';
  const formattedAmount = formatCurrency(totalAmount, currency);
  const formattedDate = formatDate(eventDate);
  const venueLocation = [venueName, venueCity].filter(Boolean).join(', ');
  const bookingDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const subject = `Ticket Confirmed — ${eventName}`;

  const text = [
    `TICKET CONFIRMED`,
    ``,
    `Hello ${customerName},`,
    ``,
    `Your booking for "${eventName}" has been confirmed.`,
    ``,
    `Booking Code:  ${bookingCode}`,
    `Seats:        ${seatList}`,
    formattedDate ? `Date:         ${formattedDate}` : null,
    venueLocation ? `Venue:        ${venueLocation}` : null,
    `Total Paid:   ${formattedAmount}`,
    ``,
    `View your e-tickets: ${ticketUrl}`,
    ``,
    `Thank you for your purchase!`,
    ``,
    `EventTix Team`,
  ].filter(Boolean).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <!--[if mso]><table role="presentation" width="100%"><tr><td align="center"><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr><td style="padding:20px 12px;">

      <!-- Email container -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header banner -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 40px;text-align:center;">
            <h1 style="margin:0 0 4px;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Ticket Confirmed</h1>
            <p style="margin:0;color:#94a3b8;font-size:13px;">Your booking is confirmed and your seats are reserved</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 8px;">
            <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;">
              Hello <strong>${customerName}</strong>,
            </p>
            <p style="margin:0 0 28px;color:#334155;font-size:15px;line-height:1.6;">
              Your payment for <strong>${eventName}</strong> has been successfully processed. Here are your booking details:
            </p>

            <!-- Details card -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:13px;width:110px;vertical-align:top;">Booking Code</td>
                    <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${bookingCode}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top;">Event</td>
                    <td style="padding:6px 0;color:#0f172a;font-size:14px;">${eventName}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top;">Seats</td>
                    <td style="padding:6px 0;color:#0f172a;font-size:14px;">${seatList}</td>
                  </tr>
                  ${formattedDate ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top;">Date</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${formattedDate}</td></tr>` : ''}
                  ${venueLocation ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top;">Venue</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${venueLocation}</td></tr>` : ''}
                  <tr>
                    <td style="padding:10px 0 6px;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;vertical-align:top;">Total Paid</td>
                    <td style="padding:10px 0 6px;color:#0f172a;font-size:18px;font-weight:700;border-top:1px solid #e2e8f0;">${formattedAmount}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- CTA button -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:8px;">
                <a href="${ticketUrl}" style="display:inline-block;background-color:#0f172a;color:#ffffff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View E-Tickets</a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;line-height:1.5;">
              Booking Date: ${bookingDate}
            </p>
            <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;line-height:1.5;">
              Need help? Reply to this email or visit our support page.
            </p>
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              &copy; ${new Date().getFullYear()} EventTix. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;

  return { subject, html, text };
}
