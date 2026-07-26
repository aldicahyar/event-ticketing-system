import { IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength, Matches, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CODE_PATTERN = '^[A-Z][A-Z0-9_]{1,29}$';
const MENU_CODE_PATTERN = '^[A-Z][A-Z0-9_]{1,49}$';

export class CreateRoleDto {
  @ApiProperty({ example: 'CASHIER', pattern: CODE_PATTERN })
  @IsString()
  @Matches(new RegExp(CODE_PATTERN), {
    message: 'code must be uppercase alphanumeric + underscore, 2-30 chars, start with letter',
  })
  code: string;

  @ApiProperty({ example: 'Cashier' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Walk-in ticket sales' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateMenuDto {
  @ApiProperty({ example: 'EVENTS_CATEGORIES', pattern: MENU_CODE_PATTERN })
  @IsString()
  @Matches(new RegExp(MENU_CODE_PATTERN), {
    message: 'code must be uppercase alphanumeric + underscore, 2-50 chars, start with letter',
  })
  code: string;

  @ApiProperty({ example: 'Event Categories' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string;

  @ApiPropertyOptional({ example: 'EVENTS', description: 'Parent menu code (null = root)' })
  @IsOptional()
  @IsString()
  parentCode?: string | null;

  @ApiPropertyOptional({ example: 'FolderTree', description: 'Lucide icon name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ example: '/dashboard/events/categories' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  isNewTab?: boolean;
}

export class UpdateMenuDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  isNewTab?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  isActive?: boolean;
}

export class PermissionCellDto {
  @ApiProperty({ example: 'EVENTS' })
  @IsString()
  menuCode: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  canView?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  canCreate?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  canEdit?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  canDelete?: boolean;
}

export class ReplacePermissionsDto {
  @ApiProperty({ type: [PermissionCellDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PermissionCellDto)
  permissions: PermissionCellDto[];
}

export class AssignRoleDto {
  @ApiProperty({ example: 'CASHIER' })
  @IsString()
  @Matches(new RegExp(CODE_PATTERN), { message: 'invalid roleCode format' })
  roleCode: string;
}
