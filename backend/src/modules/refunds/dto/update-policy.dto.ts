import { IsInt, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Body for PATCH /refunds/policies/:ruleCode — admin updating a refund policy.
 * At least one field must be provided.
 */
export class UpdateRefundPolicyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
