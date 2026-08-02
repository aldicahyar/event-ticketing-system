import { formatCurrency } from './currency.utils';

describe('formatCurrency', () => {
  it('formats IDR with dots as thousand separators and no decimals', () => {
    expect(formatCurrency(1500000, 'idr')).toBe('Rp 1.500.000');
    expect(formatCurrency(832500, 'IDR')).toBe('Rp 832.500');
  });

  it('rounds fractional IDR amounts', () => {
    expect(formatCurrency(825000.0000001, 'IDR')).toBe('Rp 825.000');
  });

  it('never uses commas for IDR', () => {
    expect(formatCurrency(1500000, 'IDR')).not.toContain(',');
  });

  it('formats known non-IDR currencies via Intl', () => {
    expect(formatCurrency(150, 'usd')).toBe('$150.00');
  });

  it('falls back gracefully for invalid currency codes', () => {
    // Intl.NumberFormat throws RangeError for non 3-letter ISO codes.
    expect(formatCurrency(100, 'US')).toBe('100 US');
  });

  it('falls back to the default currency when none is provided', () => {
    expect(formatCurrency(2000, undefined as unknown as string)).toBe('Rp 2.000');
  });
});
