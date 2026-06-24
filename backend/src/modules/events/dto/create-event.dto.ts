import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';

export class CreateEventDto {
  @ApiProperty({ example: 'BMTH Concert Live in Jakarta' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title: string;

  @ApiProperty({ example: 'Bring Me The Horizon returns with their most explosive tour yet.' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({
    example: 'cmqotgog30005advvy6o3hauf',
    description: 'ID of the venue hosting the event',
  })
  @IsString()
  venueId: string;

  @ApiProperty({ example: '2026-08-15T19:00:00.000Z' })
  @IsDateString()
  startDateTime: string;

  @ApiProperty({ example: '2026-08-15T22:00:00.000Z' })
  @IsDateString()
  endDateTime: string;

  @ApiProperty({ example: 750000, description: 'Base price of tickets for this event' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ example: 'IDR', default: 'IDR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ enum: EventStatus, default: EventStatus.DRAFT })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
