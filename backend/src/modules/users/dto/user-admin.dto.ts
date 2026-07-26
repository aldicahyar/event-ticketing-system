import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type, Transform, TransformFnParams } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../common/decorators/strong-password.decorator';

const ROLE_CODE_PATTERN = '^[A-Z][A-Z0-9_]{1,29}$';

/**
 * Parse a boolean that arrived as a query string.
 *
 * The global ValidationPipe runs with `enableImplicitConversion: true`, and
 * class-transformer implements that as a bare `Boolean(value)` — which turns
 * the string `"false"` into `true`. We therefore read the *raw* value off the
 * source object (`obj[key]`) rather than the already-coerced `value`.
 *
 * Anything that is neither a boolean nor one of true/false/1/0 is passed
 * through untouched so `@IsBoolean()` rejects it with a 400.
 */
const parseQueryBoolean = ({ obj, key }: TransformFnParams) => {
  const raw = obj?.[key];
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw === 'boolean') return raw;
  const normalized = String(raw).toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return raw;
};

export const USER_SORT_FIELDS = [
  'createdAt',
  'name',
  'email',
  'roleCode',
  'lastLoginAt',
] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

/**
 * Query params for GET /users (admin monitoring list).
 * Global ValidationPipe runs with `enableImplicitConversion: true`,
 * so `?isActive=true&page=2` arrive already coerced to boolean/number.
 */
export class ListUsersQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search on name or email' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ example: 'ADMIN', description: 'Filter by exact role code' })
  @IsOptional()
  @IsString()
  @Matches(new RegExp(ROLE_CODE_PATTERN), { message: 'invalid roleCode format' })
  roleCode?: string;

  @ApiPropertyOptional({ description: 'Filter by account active flag' })
  @IsOptional()
  @Transform(parseQueryBoolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by email verification status' })
  @IsOptional()
  @Transform(parseQueryBoolean)
  @IsBoolean()
  emailVerified?: boolean;

  @ApiPropertyOptional({ example: 'local', description: 'Auth provider (local, google, ...)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  provider?: string;

  @ApiPropertyOptional({
    description: 'true = only accounts currently locked out, false = only unlocked',
  })
  @IsOptional()
  @Transform(parseQueryBoolean)
  @IsBoolean()
  locked?: boolean;

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

  @ApiPropertyOptional({ enum: USER_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(USER_SORT_FIELDS as unknown as string[])
  sortBy?: UserSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class CreateUserDto {
  @ApiProperty({ example: 'cashier@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Jane Cashier' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'SecureP@ss123',
    description: 'Min 8 chars with uppercase, lowercase, number and special character',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword()
  password: string;

  @ApiProperty({ example: 'ATTENDEE', pattern: ROLE_CODE_PATTERN })
  @IsString()
  @Matches(new RegExp(ROLE_CODE_PATTERN), { message: 'invalid roleCode format' })
  roleCode: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Admin-created accounts are marked verified by default',
  })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'ORGANIZER', pattern: ROLE_CODE_PATTERN })
  @IsOptional()
  @IsString()
  @Matches(new RegExp(ROLE_CODE_PATTERN), { message: 'invalid roleCode format' })
  roleCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}

export class AdminResetPasswordDto {
  @ApiProperty({
    example: 'NewSecureP@ss123',
    description: 'Min 8 chars with uppercase, lowercase, number and special character',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword()
  newPassword: string;
}
