import { EmailContent, PaymentSuccessEmailData } from '../interfaces/email-template.interface';
import { formatCurrency } from '../../../common/utils/currency.utils';

/** Renders timestamps in Asia/Jakarta with an explicit WIB suffix — the same
 *  convention as the PDF invoice. Without `timeZone`, a UTC server shifted
 *  event/payment times by up to 7 hours (bug report: wrong date on email). */
function formatWib(isoDate: string | null, includeTime = true): string | null {
  if (!isoDate) return null;
  try {
    return (
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
      })
        .format(new Date(isoDate))
        .replace(',', '') + (includeTime ? ' WIB' : '')
    );
  } catch {
    return isoDate;
  }
}

/**
 * Renders the payment-success email.
 *
 * Sent when a Stripe checkout.session.completed webhook confirms a booking.
 * Receipt-style layout:
 * - Grouped seats by tier (e.g. "Regular Tier × 2")
 * - Seat numbers rendered as sleek pill/badge tags
 * - Transparent breakdown: Subtotal, Tax/Fee, Total Paid
 * - Distinct Payment Date (WIB) vs Event Date (WIB)
 */
export function buildPaymentSuccessEmail(data: PaymentSuccessEmailData): EmailContent {
  const {
    bookingCode,
    eventName,
    customerName,
    totalAmount,
    currency,
    seats,
    groupedItems,
    subtotal: explicitSubtotal,
    taxAmount: explicitTaxAmount,
    eventDate,
    paidAt,
    venueName,
    venueCity,
    ticketUrl,
  } = data;

  const formattedAmount = formatCurrency(totalAmount, currency);
  const formattedEventDate = formatWib(eventDate);
  const formattedPaidAt = formatWib(paidAt ?? new Date().toISOString());
  const venueLocation = [venueName, venueCity].filter(Boolean).join(', ');

  // Fallback: If groupedItems is not provided, aggregate the flat `seats` array
  const groups =
    groupedItems && groupedItems.length > 0
      ? groupedItems
      : [
          {
            type: 'General Admission',
            quantity: seats.length || 1,
            totalPrice: totalAmount,
            seatNumbers: seats.length > 0 ? seats : ['GA'],
          },
        ];

  const subtotal = explicitSubtotal ?? groups.reduce((acc, g) => acc + g.totalPrice, 0);
  const taxAmount = explicitTaxAmount ?? (totalAmount > subtotal ? totalAmount - subtotal : 0);

  const subject = `Ticket Confirmed — ${eventName}`;

  // Plain-text alternative
  const text = [
    `TICKET CONFIRMED`,
    ``,
    `Hello ${customerName},`,
    ``,
    `Your payment for "${eventName}" has been confirmed.`,
    ``,
    `Booking Code:  ${bookingCode}`,
    `Payment Date: ${formattedPaidAt}`,
    ``,
    `ITEMS:`,
    ...groups.map(
      (g) =>
        `  ${g.type} × ${g.quantity} — ${formatCurrency(g.totalPrice, currency)}\n  Seats: [${g.seatNumbers.join('] [')}]`,
    ),
    ``,
    `Subtotal:     ${formatCurrency(subtotal, currency)}`,
    taxAmount > 0 ? `Tax & Fees:   ${formatCurrency(taxAmount, currency)}` : null,
    `Total Paid:   ${formattedAmount}`,
    ``,
    formattedEventDate ? `Event Date:   ${formattedEventDate}` : null,
    venueLocation ? `Venue:        ${venueLocation}` : null,
    ``,
    `View your e-tickets: ${ticketUrl}`,
    ``,
    `Thank you for your purchase!`,
    ``,
    `EventTix Team`,
  ]
    .filter(Boolean)
    .join('\n');

  // HTML Email
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
    <tr><td style="padding:24px 12px;">

      <!-- Email container -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header banner -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 40px;text-align:center;">
            <div style="display:inline-block;width:44px;height:44px;line-height:44px;border-radius:50%;background-color:#10b981;color:#ffffff;font-size:22px;font-weight:700;">&#10003;</div>
            <h1 style="margin:12px 0 4px;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">PAYMENT SUCCESSFUL</h1>
            <p style="margin:0;color:#94a3b8;font-size:13px;">Your booking is confirmed and your seats are reserved</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 8px;">
            <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
              Hello <strong>${customerName}</strong>,
            </p>
            <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;">
              We received your payment for <strong>${eventName}</strong>. Here is your receipt:
            </p>

            <!-- Receipt Header: Booking Code & Payment Date -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:8px 8px 0 0;margin-bottom:0;">
              <tr>
                <td style="padding:16px 24px;">
                  <span style="color:#94a3b8;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Booking Code</span><br>
                  <span style="color:#ffffff;font-size:17px;font-weight:700;font-family:'Courier New',Courier,monospace;letter-spacing:1px;">${bookingCode}</span>
                </td>
                <td align="right" style="padding:16px 24px;">
                  <span style="color:#94a3b8;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Payment Date</span><br>
                  <span style="color:#ffffff;font-size:14px;font-weight:600;">${formattedPaidAt}</span>
                </td>
              </tr>
            </table>

            <!-- Receipt Body: Grouped Items & Pills -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-top:none;">
              <tr>
                <td style="padding:14px 24px 8px;color:#64748b;font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">Items</td>
              </tr>

              ${groups
                .map(
                  (group) => `
              <tr>
                <td style="padding:10px 24px 14px;border-bottom:1px dashed #e2e8f0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="color:#0f172a;font-size:14px;font-weight:700;">
                        ${group.type} <span style="color:#64748b;font-weight:500;font-size:13px;">&times; ${group.quantity}</span>
                      </td>
                      <td align="right" style="color:#0f172a;font-size:14px;font-weight:600;white-space:nowrap;">
                        ${formatCurrency(group.totalPrice, currency)}
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding-top:8px;">
                        <div style="font-size:0;">
                          ${group.seatNumbers
                            .map(
                              (seat) =>
                                `<span style="display:inline-block;background-color:#ffffff;border:1px solid #cbd5e1;border-radius:4px;padding:3px 9px;margin:0 6px 6px 0;font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;color:#1e293b;letter-spacing:0.5px;box-shadow:0 1px 2px rgba(0,0,0,0.03);">${seat}</span>`,
                            )
                            .join('')}
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`,
                )
                .join('')}

              <!-- Pricing summary -->
              <tr>
                <td style="padding:14px 24px 4px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="color:#64748b;font-size:13px;">Subtotal</td>
                      <td align="right" style="color:#334155;font-size:13px;">${formatCurrency(subtotal, currency)}</td>
                    </tr>
                  </table>
                </td>
              </tr>

              ${
                taxAmount > 0
                  ? `
              <tr>
                <td style="padding:4px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="color:#64748b;font-size:13px;">Tax & Fees</td>
                      <td align="right" style="color:#334155;font-size:13px;">${formatCurrency(taxAmount, currency)}</td>
                    </tr>
                  </table>
                </td>
              </tr>`
                  : ''
              }

              <tr>
                <td style="padding:8px 24px 16px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="color:#0f172a;font-size:14px;font-weight:700;">Total Paid</td>
                      <td align="right" style="color:#0f172a;font-size:16px;font-weight:700;">${formattedAmount}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Event Details (Without redundant seat list) -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;margin-bottom:28px;">
              <tr>
                <td style="padding:16px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;color:#64748b;font-size:13px;width:110px;vertical-align:top;">Event</td>
                      <td style="padding:4px 0;color:#0f172a;font-size:14px;font-weight:600;">${eventName}</td>
                    </tr>
                    ${
                      formattedEventDate
                        ? `
                    <tr>
                      <td style="padding:4px 0;color:#64748b;font-size:13px;vertical-align:top;">Event Date</td>
                      <td style="padding:4px 0;color:#0f172a;font-size:14px;">${formattedEventDate}</td>
                    </tr>`
                        : ''
                    }
                    ${
                      venueLocation
                        ? `
                    <tr>
                      <td style="padding:4px 0;color:#64748b;font-size:13px;vertical-align:top;">Venue</td>
                      <td style="padding:4px 0;color:#0f172a;font-size:14px;">${venueLocation}</td>
                    </tr>`
                        : ''
                    }
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA button -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:12px;">
                <a href="${ticketUrl}" style="display:inline-block;background-color:#0f172a;color:#ffffff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.5px;">View E-Tickets</a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px 32px;border-top:1px solid #e2e8f0;">
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
