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
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../../../common/constants/currency.constants';
import { CreateTicketTierDto } from './create-ticket-tier.dto';

export class UpdateEventDto {
  @ApiProperty({ example: 'cmqotgog30005advvy6o3hauf', description: 'ID of the event to update' })
  @IsString()
  id: string;

  @ApiPropertyOptional({ example: 'BMTH Concert Live in Jakarta (Updated)' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'POST HUMAN: SURVIVAL HORROR' })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'Updated description here...' })
  @IsString()
  @MinLength(10)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'cmqotgog30005advvy6o3hauf' })
  @IsString()
  @IsOptional()
  venue_id?: string;

  @ApiPropertyOptional({ example: '2026-08-15T19:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  event_date?: string;

  @ApiPropertyOptional({ example: '2026-07-15T10:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  start_date_time?: string;

  @ApiPropertyOptional({ example: '2026-08-15T22:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  end_date_time?: string;

  @ApiPropertyOptional({ example: 800000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  base_price?: number;

  @ApiPropertyOptional({ example: 'IDR', enum: SUPPORTED_CURRENCIES })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(SUPPORTED_CURRENCIES, { message: 'Only IDR is currently supported' })
  currency?: SupportedCurrency;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...jpg' })
  @IsString()
  @IsOptional()
  image_url?: string;

  @ApiPropertyOptional({ type: [CreateTicketTierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketTierDto)
  ticket_tiers?: CreateTicketTierDto[];
}
