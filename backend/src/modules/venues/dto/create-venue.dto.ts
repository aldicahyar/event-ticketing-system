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

export class CreateVenueDto {
  @ApiProperty({ example: 'Tennis Indoor Senayan' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Jl. Pintu Satu Senayan, Gelora' })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  address: string;

  @ApiProperty({ example: 'Jakarta' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'Indonesia' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country: string;

  @ApiProperty({ example: 5000 })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({
    example: {
      rows: 10,
      seatsPerRow: 10,
      layout: 'STADIUM',
    },
    description: 'JSON object describing rows, seats per row, and layout type',
  })
  @IsObject()
  seatMap: Record<string, any>;

  @ApiPropertyOptional({ example: 'Tennis Indoor arena with modern facilities.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
