import { DEFAULT_CURRENCY } from '../constants/currency.constants';

/**
 * Formats a numeric amount with its currency code into a human-readable string.
 *
 * Single source of truth for currency formatting across the backend (previously
 * duplicated in payment-success and payment-refunded email templates).
 *
 * IDR is formatted manually (no decimals, "." as thousand separator) because
 * `toLocaleString('id-ID')` may fall back to en-US (commas) when Node.js lacks
 * full ICU data. Other currencies use Intl.NumberFormat, with a plain fallback.
 */
export function formatCurrency(amount: number, currency: string): string {
  const code = (currency ?? DEFAULT_CURRENCY).toUpperCase();
  if (code === 'IDR') {
    const rounded = Math.round(amount);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp ${formatted}`;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}
