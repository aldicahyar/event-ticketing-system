import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

class PageQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class QueryAdminPaymentDto extends PageQuery {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  event_id?: string;

  /** Inclusive lower bound on created_at (YYYY-MM-DD). */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /** Inclusive upper bound on created_at (YYYY-MM-DD). */
  @IsOptional()
  @IsISO8601()
  to?: string;

  /** Booking code or Stripe transaction id fragment. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;
}

export class AdminRefundDto {
  /** Support-case justification; stored in the refund + audit trail. */
  @IsString()
  @MaxLength(500)
  note: string;
}

export class QueryActivityDto extends PageQuery {
  /** Prisma model name, e.g. t_trx_payments. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  model?: string;

  @IsOptional()
  @IsEnum({ CREATE: 'CREATE', UPDATE: 'UPDATE', DELETE: 'DELETE' })
  action?: 'CREATE' | 'UPDATE' | 'DELETE';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  target_id?: string;

  @IsOptional()
  @IsString()
  actor_id?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
