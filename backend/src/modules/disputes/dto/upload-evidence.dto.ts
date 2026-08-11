import { DisputeEvidenceType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UploadEvidenceDto {
  @IsEnum(DisputeEvidenceType)
  evidence_type!: DisputeEvidenceType;
}
