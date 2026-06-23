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

  @ApiPropertyOptional({ example: 'Updated description here...' })
  @IsString()
  @MinLength(10)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'cmqotgog30005advvy6o3hauf' })
  @IsString()
  @IsOptional()
  venueId?: string;

  @ApiPropertyOptional({ example: '2026-08-15T19:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startDateTime?: string;

  @ApiPropertyOptional({ example: '2026-08-15T22:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  endDateTime?: string;

  @ApiPropertyOptional({ example: 800000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({ example: 'IDR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
