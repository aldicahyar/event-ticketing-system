import {
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsOptional,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Predefined cancellation reason codes shown as a dropdown in the UI.
 * Stored as a prefix in `cancelled_reason` for audit traceability.
 */
export const CANCEL_REASON_CODES = [
  'CHANGE_OF_PLANS',
  'SCHEDULE_CONFLICT',
  'FOUND_ALTERNATIVE',
  'NO_LONGER_INTERESTED',
  'PAYMENT_ISSUE',
  'OTHER',
] as const;

export type CancelReasonCode = (typeof CANCEL_REASON_CODES)[number];

export class CheckoutDto {
  @IsString()
  event_id: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  seatIds: string[];

  @IsOptional()
  @IsString()
  guest_name?: string;

  @IsOptional()
  @IsString()
  guest_email?: string;

  @IsOptional()
  @IsString()
  guest_phone?: string;
}

/**
 * Request body for POST /bookings/:id/cancel.
 * - `reason`: a predefined code selected from a dropdown.
 * - `description`: free-text explanation (mandatory, min 5 chars).
 */
export class CancelBookingDto {
  @IsIn(CANCEL_REASON_CODES)
  reason: CancelReasonCode;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  description: string;
}
