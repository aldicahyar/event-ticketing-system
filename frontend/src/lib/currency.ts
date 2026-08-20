/**
 * Single source of truth for currency formatting on the frontend.
 *
 * Mirrors the backend `currency.utils.ts` so emails, dashboard, and checkout
 * all render identical strings. Kept as a per-side util (instead of the dormant
 * `shared/` package) to avoid introducing a build dependency for one function.
 *
 * IDR uses manual dot separators because Node/browsers may fall back to en-US
 * ICU data. Non-IDR currencies use en-US grouping via toLocaleString.
 */
export const DEFAULT_CURRENCY = 'IDR';

export function formatCurrency(
  value: string | number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return `${currency} 0`;
  const code = currency.toUpperCase();
  if (code === 'IDR') {
    return `Rp ${Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  }
  return `${code} ${num.toLocaleString('en-US')}`;
}

export function formatNumberWithDots(val: number | string): string {
  if (val === '' || val === undefined || val === null || val === 0) return '';
  const cleanStr = String(val).replace(/\D/g, '');
  if (!cleanStr) return '';
  return cleanStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseDotsToNumber(val: string): number {
  const cleanStr = String(val).replace(/\D/g, '');
  return cleanStr ? Number(cleanStr) : 0;
}
