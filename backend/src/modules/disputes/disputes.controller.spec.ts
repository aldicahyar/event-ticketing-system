import { BadRequestException } from '@nestjs/common';
import { DisputeEvidenceType } from '@prisma/client';
import { Readable } from 'node:stream';
import { PERMISSION_KEY } from '../../common/decorators/require-permission.decorator';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';

describe('DisputesController', () => {
  const service = { list: jest.fn(), upload: jest.fn() } as unknown as DisputesService;
  const controller = new DisputesController(service);

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['list', 'view'],
    ['detail', 'view'],
    ['sync', 'edit'],
    ['draft', 'edit'],
    ['upload', 'edit'],
    ['submit', 'edit'],
    ['close', 'edit'],
  ])('requires DISPUTES %s permission on %s', (method, action) => {
    expect(
      Reflect.getMetadata(
        PERMISSION_KEY,
        DisputesController.prototype[method as keyof DisputesController] as unknown as object,
      ),
    ).toEqual({ menu_code: 'DISPUTES', action });
  });

  it('parses one file and one allowlisted evidence_type', async () => {
    const file = {
      filename: 'receipt.pdf',
      mimetype: 'application/pdf',
      file: Readable.from(Buffer.from('%PDF-')),
      fields: { evidence_type: { value: DisputeEvidenceType.RECEIPT } },
    };
    const request = { file: jest.fn().mockResolvedValue(file) };

    await controller.upload('dispute-1', request as never, 'admin-1');

    expect(request.file).toHaveBeenCalledWith({
      limits: { files: 1, fields: 1, fileSize: 5 * 1024 * 1024 },
    });
    expect(service.upload).toHaveBeenCalledWith(
      'dispute-1',
      DisputeEvidenceType.RECEIPT,
      file,
      'admin-1',
    );
  });

  it('rejects unknown multipart fields as evidence_type', async () => {
    const request = {
      file: jest.fn().mockResolvedValue({
        filename: 'receipt.pdf',
        mimetype: 'application/pdf',
        file: Readable.from(Buffer.from('%PDF-')),
        fields: { evidence_type: { value: 'SECRET_FIELD' } },
      }),
    };

    await expect(controller.upload('dispute-1', request as never, 'admin-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
