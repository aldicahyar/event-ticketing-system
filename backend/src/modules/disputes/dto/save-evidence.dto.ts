import { IsEmail, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveEvidenceDto {
  @IsOptional() @IsString() @MaxLength(5000) product_description?: string;
  @IsOptional() @IsString() @MaxLength(255) customer_name?: string;
  @IsOptional() @IsEmail() customer_email?: string;
  @IsOptional() @IsISO8601() service_date?: string;
  @IsOptional() @IsString() @MaxLength(5000) access_activity?: string;
  @IsOptional() @IsString() @MaxLength(5000) uncategorized?: string;
}
