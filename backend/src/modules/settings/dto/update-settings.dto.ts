import { IsString, IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SeatType } from '@prisma/client';

export class UpdateTierSettingDto {
  @ApiProperty({ enum: SeatType, example: SeatType.VIP })
  @IsEnum(SeatType)
  id: SeatType;

  @ApiProperty({ example: 0.2, description: 'Row distribution ratio (0.0 to 1.0)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  ratio: number;

  @ApiProperty({ example: 2, description: 'Price multiplier for this tier' })
  @IsNumber()
  @Min(0)
  multiplier: number;

  @ApiPropertyOptional({ example: 'ACTIVE', default: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateTaxSettingDto {
  @ApiProperty({ example: 11, description: 'PPN/VAT percentage' })
  @IsNumber()
  @Min(0)
  ppn_percent: number;

  @ApiPropertyOptional({ example: 'ACTIVE', default: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;
}
