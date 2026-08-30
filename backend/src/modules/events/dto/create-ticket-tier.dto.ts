import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketTierDto {
  @ApiProperty({ example: 'VIP Early Bird' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 500000, description: 'Price for this specific ticket tier' })
  @IsNumber()
  @Min(1, { message: 'Price must be greater than 0' })
  price: number;

  @ApiProperty({ example: 100, description: 'Available quota / seats for this tier' })
  @IsNumber()
  @Min(0, { message: 'Stock cannot be negative' })
  stock: number;

  @ApiPropertyOptional({ example: 'Includes front-row seating and welcome kit' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: ['VIP Lounge', 'Fast Track'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Set to true if selecting specific seats is required',
  })
  @IsBoolean()
  @IsOptional()
  is_seated?: boolean;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  @IsDateString()
  start_date_time: string;

  @ApiProperty({ example: '2026-08-01T23:59:59.000Z' })
  @IsDateString()
  end_date_time: string;
}
