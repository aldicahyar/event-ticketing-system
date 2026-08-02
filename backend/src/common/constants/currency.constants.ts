/**
 * Single supported currency for the platform (IDR).
 *
 * Design decision (ADR-001, Phase 4): the platform is locked to Indonesian
 * Rupiah. Bank Indonesia Regulation 17/3/PBI/2015 mandates Rupiah-only price
 * quotation for transactions within Indonesian territory, and the events are
 * consumed on-site in Indonesia.
 *
 * Note on Stripe: IDR is a TWO-decimal currency in Stripe, so the smallest-unit
 * amount is `amount * 100` (e.g. Rp 832.500 -> unit_amount 83250000). This is
 * NOT a zero-decimal currency; do not remove the * 100 / / 100 conversions.
 */
export const DEFAULT_CURRENCY = 'IDR';

/**
 * Whitelist of currencies the platform accepts. Kept as an array so that
 * multi-currency expansion is a matter of adding members plus lifting the DTO
 * restriction, without reworking the surrounding architecture.
 */
export const SUPPORTED_CURRENCIES = ['IDR'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
