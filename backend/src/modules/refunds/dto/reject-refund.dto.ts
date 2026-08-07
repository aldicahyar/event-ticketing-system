import { IsString, MaxLength } from 'class-validator';

/**
 * Body for PATCH /refunds/:id/reject — admin/organizer rejecting a refund request.
 */
export class RejectRefundDto {
  @IsString()
  @MaxLength(500)
  note?: string;
}
