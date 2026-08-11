import { formatCurrency } from '../../../common/utils/currency.utils';
import {
  DisputeOpenedEmailData,
  EmailContent,
} from '../interfaces/email-template.interface';

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  );
}

export function buildDisputeOpenedEmail(
  data: DisputeOpenedEmailData,
): EmailContent {
  const amount = formatCurrency(data.amount, data.currency);
  const deadline = data.deadline ?? 'not provided';
  const subject = `Action required: dispute ${data.disputeId}`;
  const details = [
    `Booking: ${data.bookingCode}`,
    `Reason: ${data.reason}`,
    `Amount: ${amount}`,
    `Evidence deadline: ${deadline}`,
    `Review: ${data.link}`,
  ];

  return {
    subject,
    text: `${subject}\n${details.join('\n')}`,
    html:
      `<h2>${escapeHtml(subject)}</h2>` +
      `<p>Booking: <strong>${escapeHtml(data.bookingCode)}</strong></p>` +
      `<p>Reason: ${escapeHtml(data.reason)}</p>` +
      `<p>Amount: ${escapeHtml(amount)}</p>` +
      `<p>Evidence deadline: <strong>${escapeHtml(deadline)}</strong></p>` +
      `<p><a href="${escapeHtml(data.link)}">Review dispute</a></p>`,
  };
}
