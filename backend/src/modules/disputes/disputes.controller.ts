import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { DisputeEvidenceType } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import type { Readable } from 'node:stream';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { DisputesService } from './disputes.service';
import { QueryDisputeDto, SaveEvidenceDto } from './dto';

interface MultipartEvidenceFile {
  filename: string;
  mimetype: string;
  file: Readable;
  fields: Record<string, { value?: unknown } | undefined>;
}

type MultipartRequest = Omit<FastifyRequest, 'file'> & {
  file(options?: {
    limits?: { files?: number; fileSize?: number; fields?: number };
  }): Promise<MultipartEvidenceFile | undefined>;
};

const evidenceTypes = new Set<string>(Object.values(DisputeEvidenceType));

@ApiTags('disputes')
@ApiBearerAuth()
@Controller('disputes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DisputesController {
  constructor(private readonly service: DisputesService) {}

  @Get()
  @RequirePermission('DISPUTES', 'view')
  list(@Query() query: QueryDisputeDto) {
    return this.service.list(query.status, query.page, query.limit);
  }

  @Get(':id')
  @RequirePermission('DISPUTES', 'view')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post(':id/sync')
  @RequirePermission('DISPUTES', 'edit')
  sync(@Param('id') id: string) {
    return this.service.sync(id);
  }

  @Patch(':id/evidence')
  @RequirePermission('DISPUTES', 'edit')
  draft(@Param('id') id: string, @Body() body: SaveEvidenceDto) {
    return this.service.saveDraft(id, body);
  }

  @Post(':id/evidence/documents')
  @RequirePermission('DISPUTES', 'edit')
  @ApiConsumes('multipart/form-data')
  async upload(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
    @CurrentUser('id') actorId: string,
  ) {
    const file = await (request as MultipartRequest).file({
      limits: { files: 1, fields: 1, fileSize: 5 * 1024 * 1024 },
    });
    if (!file) {
      throw new BadRequestException('Evidence file is required');
    }

    const evidenceType = file.fields.evidence_type?.value;
    if (typeof evidenceType !== 'string' || !evidenceTypes.has(evidenceType)) {
      throw new BadRequestException('Valid evidence_type is required');
    }

    return this.service.upload(id, evidenceType as DisputeEvidenceType, file, actorId);
  }

  @Post(':id/evidence/submit')
  @RequirePermission('DISPUTES', 'edit')
  submit(@Param('id') id: string) {
    return this.service.submit(id);
  }

  @Post(':id/close')
  @RequirePermission('DISPUTES', 'edit')
  close(@Param('id') id: string) {
    return this.service.close(id);
  }
}
