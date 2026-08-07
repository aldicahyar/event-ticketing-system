import { formatCurrency } from '../../../common/utils/currency.utils';
import { EmailContent, RefundStatusEmailData } from '../interfaces/email-template.interface';

export function buildRefundStatusEmail(data: RefundStatusEmailData): EmailContent {
  const amount = formatCurrency(data.refundAmount, data.currency);
  const subject = `Refund ${data.status} — ${data.bookingCode}`;
  const text = [
    `Hello ${data.customerName},`,
    `Your refund request for ${data.eventName} is now ${data.status}.`,
    `Amount: ${amount}`,
    data.note ? `Note: ${data.note}` : '',
  ].filter(Boolean).join('\n');

  return {
    subject,
    text,
    html: `<h2>${subject}</h2><p>Hello ${data.customerName},</p><p>Your refund request for <strong>${data.eventName}</strong> is now <strong>${data.status}</strong>.</p><p>Amount: <strong>${amount}</strong></p>${data.note ? `<p>Note: ${data.note}</p>` : ''}`,
  };
}
