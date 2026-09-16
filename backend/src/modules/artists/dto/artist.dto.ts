import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CODE_PATTERN = '^[A-Z][A-Z0-9_]*$';

export class CreateArtistDto {
  @ApiPropertyOptional({
    example: 'BRING_ME_THE_HORIZON',
    description: 'Uppercase code; auto-generated from name when omitted',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(new RegExp(CODE_PATTERN), {
    message: 'code must be uppercase letters, numbers and underscores',
  })
  code?: string;

  @ApiProperty({ example: 'Bring Me The Horizon' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'METALCORE', description: 'Primary genre id' })
  @IsOptional()
  @IsString()
  genre_id?: string;

  @ApiPropertyOptional({ example: 'Sheffield, England' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  origin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ description: 'Media library URL for the artist photo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateArtistDto {
  @ApiPropertyOptional({ example: 'BRING_ME_THE_HORIZON' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(new RegExp(CODE_PATTERN), {
    message: 'code must be uppercase letters, numbers and underscores',
  })
  code?: string;

  @ApiPropertyOptional({ example: 'Bring Me The Horizon' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ description: 'Primary genre id' })
  @IsOptional()
  @IsString()
  genre_id?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  origin?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string | null;

  @ApiPropertyOptional({ description: 'Media library URL for the artist photo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ListArtistsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
