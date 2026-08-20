import { IsIn, IsOptional, Matches } from 'class-validator';

/** Bucket granularity for the revenue time series. Maps to SQL date_trunc units. */
export type RevenuePeriod = 'daily' | 'weekly' | 'monthly';

export class RevenueQueryDto {
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  period: RevenuePeriod = 'daily';
}

/**
 * Explicit date window for CSV export and Stripe reconciliation.
 * Dates are inclusive calendar days (YYYY-MM-DD); the service resolves `to`
 * to end-of-day. Range validity (from <= to, span cap) is enforced in the service.
 */
export class RangeQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be an ISO date (YYYY-MM-DD)' })
  from!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be an ISO date (YYYY-MM-DD)' })
  to!: string;
}
