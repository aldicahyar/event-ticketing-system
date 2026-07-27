import { IsString, IsArray, ArrayNotEmpty, IsOptional } from 'class-validator';

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
