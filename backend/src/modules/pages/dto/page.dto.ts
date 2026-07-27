import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Mirrors the Prisma PageStatus enum (kept as a string union for validation). */
export enum PageStatusDto {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

const SLUG_PATTERN = '^[a-z0-9]+(?:-[a-z0-9]+)*$';

export class CreatePageDto {
  @ApiProperty({ example: 'about', pattern: SLUG_PATTERN })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(new RegExp(SLUG_PATTERN), {
    message: 'slug must be lowercase alphanumeric words separated by single hyphens',
  })
  slug: string;

  @ApiProperty({ example: 'About Us' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;

  @ApiProperty({ description: 'Rich-text HTML (sanitized server-side)' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: PageStatusDto, default: PageStatusDto.DRAFT })
  @IsOptional()
  @IsEnum(PageStatusDto)
  status?: PageStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  seo_title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  seo_description?: string;

  @ApiPropertyOptional({ description: 'Media id used as the OG/share image' })
  @IsOptional()
  @IsString()
  og_image_id?: string;
}

export class UpdatePageDto {
  @ApiPropertyOptional({ pattern: SLUG_PATTERN })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(new RegExp(SLUG_PATTERN), {
    message: 'slug must be lowercase alphanumeric words separated by single hyphens',
  })
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: PageStatusDto })
  @IsOptional()
  @IsEnum(PageStatusDto)
  status?: PageStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  seo_title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  seo_description?: string;

  @ApiPropertyOptional({ description: 'Media id, or null to clear' })
  @IsOptional()
  @IsString()
  og_image_id?: string | null;
}

export class ListPagesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: PageStatusDto })
  @IsOptional()
  @IsEnum(PageStatusDto)
  status?: PageStatusDto;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
