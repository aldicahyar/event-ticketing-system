import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PerkType } from '@prisma/client';

export class CreatePerkDto {
  @ApiProperty({ example: 'Free Drinks', description: 'Unique label for the perk or facility' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: PerkType, example: PerkType.PERK })
  @IsEnum(PerkType)
  type: PerkType;

  @ApiPropertyOptional({ example: 'ACTIVE', default: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdatePerkDto {
  @ApiPropertyOptional({ example: 'Free Drinks (Updated)' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ enum: PerkType, example: PerkType.PERK })
  @IsEnum(PerkType)
  @IsOptional()
  type?: PerkType;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;
}
