import {
  IsString,
  IsInt,
  IsOptional,
  IsObject,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVenueDto {
  @ApiProperty({ example: 'cmqotgog30005advvy6o3hauf', description: 'ID of the venue to update' })
  @IsString()
  id: string;

  @ApiPropertyOptional({ example: ' Tennis Indoor Senayan (Updated)' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Jl. Pintu Satu Senayan, Gelora' })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Jakarta' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Indonesia' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 6000 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({
    example: {
      rows: 12,
      seatsPerRow: 10,
      layout: 'STADIUM',
    },
  })
  @IsObject()
  @IsOptional()
  seatMap?: Record<string, any>;

  @ApiPropertyOptional({ example: 'Updated description here.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
