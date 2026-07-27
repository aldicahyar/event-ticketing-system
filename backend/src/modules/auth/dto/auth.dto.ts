import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../common/decorators/strong-password.decorator';

export enum t_mtr_roles {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  ATTENDEE = 'ATTENDEE',
}

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'SecureP@ss123',
    description:
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({ example: 'SecureP@ss123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword: string;

  @ApiPropertyOptional({ enum: t_mtr_roles, default: t_mtr_roles.ATTENDEE })
  @IsEnum(t_mtr_roles)
  @IsOptional()
  role?: t_mtr_roles;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsString()
  @MinLength(1)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'abc123resettoken' })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NewSecureP@ss123',
    description:
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword()
  newPassword: string;

  @ApiProperty({ example: 'NewSecureP@ss123' })
  @IsString()
  confirmPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentP@ss123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'NewSecureP@ss123',
    description:
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword()
  newPassword: string;

  @ApiProperty({ example: 'NewSecureP@ss123' })
  @IsString()
  confirmPassword: string;
}

export class OAuthCallbackDto {
  @ApiProperty({ example: 'google' })
  @IsString()
  provider: string;

  @ApiProperty({ example: 'code' })
  @IsString()
  code: string;

  @ApiProperty({ example: '/callback' })
  @IsString()
  redirectUri: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '482917', description: '6-digit verification code' })
  @IsString()
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;
}
