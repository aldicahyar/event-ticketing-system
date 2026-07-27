import { IsString, IsArray, ArrayNotEmpty } from 'class-validator';

export class CheckoutDto {
  @IsString()
  eventId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  seatIds: string[];
}
