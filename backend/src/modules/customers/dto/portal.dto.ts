import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for POST /customers/portal — optional because the controller falls
 * back to FRONTEND_URL when the client does not send an origin.
 */
export class CreatePortalSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  returnUrl?: string;
}

/** Response for POST /customers/portal. */
export interface PortalSessionDto {
  url: string;
}
