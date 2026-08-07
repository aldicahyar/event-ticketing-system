import { IsString, IsNotEmpty, MaxLength, IsIn } from 'class-validator';
import { REFUND_REASONS } from '../refunds.constants';

/**
 * Body for POST /refunds — a user requesting a refund on their CONFIRMED booking.
 *
 * The nominal amount is NEVER sent by the client; it is computed server-side
 * from t_trx_refund_policies at approval time. Only the booking_id and reason
 * are user-supplied.
 */
export class CreateRefundDto {
  @IsString()
  @IsNotEmpty()
  booking_id: string;

  @IsIn([...REFUND_REASONS])
  reason: string;

  @IsString()
  @MaxLength(500)
  note?: string;
}
