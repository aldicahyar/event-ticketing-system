import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for PATCH /refunds/:id/approve and /reject — the moderator must record
 * a specific reason for the decision (audit trail for all moderation actions).
 */
export class ReviewRefundDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note!: string;
}
