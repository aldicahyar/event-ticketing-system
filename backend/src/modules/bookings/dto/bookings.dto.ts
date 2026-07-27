import { IsString, IsArray, ArrayNotEmpty, IsOptional } from 'class-validator';

export class CheckoutDto {
  @IsString()
  eventId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  seatIds: string[];

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsString()
  guestEmail?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;
}
