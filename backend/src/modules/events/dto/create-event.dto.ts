import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsIn,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../../../common/constants/currency.constants';

export class CreateEventDto {
  @ApiProperty({ example: 'BMTH Concert Live in Jakarta' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({ example: 'POST HUMAN: SURVIVAL HORROR' })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiProperty({ example: 'Bring Me The Horizon returns with their most explosive tour yet.' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ example: 'cmqotgog30005advvy6o3hauf', description: 'ID of the venue hosting the event' })
  @IsString()
  venue_id: string;

  @ApiProperty({ example: '2026-08-15T19:00:00.000Z' })
  @IsDateString()
  event_date: string;

  @ApiProperty({ example: '2026-07-15T10:00:00.000Z' })
  @IsDateString()
  start_date_time: string;

  @ApiProperty({ example: '2026-08-15T22:00:00.000Z' })
  @IsDateString()
  end_date_time: string;

  @ApiProperty({ example: 750000, description: 'Base price of tickets for this event' })
  @IsNumber()
  @Min(0)
  base_price: number;

  @ApiProperty({ example: 'IDR', default: 'IDR', enum: SUPPORTED_CURRENCIES })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(SUPPORTED_CURRENCIES, { message: 'Only IDR is currently supported' })
  currency?: SupportedCurrency;

  @ApiPropertyOptional({ enum: EventStatus, default: EventStatus.DRAFT })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...jpg' })
  @IsString()
  @IsOptional()
  image_url?: string;
}
