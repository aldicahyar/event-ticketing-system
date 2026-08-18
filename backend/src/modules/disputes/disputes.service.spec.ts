import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DisputeEvidenceType, DisputeStatus } from '@prisma/client';
import { Readable } from 'node:stream';
import { StripeService } from '../../common/stripe/stripe.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DisputesRepository } from './disputes.repository';
import { DisputesService } from './disputes.service';

const future = () => new Date(Date.now() + 60_000);

function dispute(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dispute-1',
    stripe_dispute_id: 'dp_1',
    status: DisputeStatus.OPEN,
    evidence_due_by: future(),
    evidence_product_description: 'Ticket purchase',
    evidence_customer_name: null,
    evidence_customer_email: null,
    evidence_service_date: null,
    evidence_access_activity: null,
    evidence_uncategorized: null,
    closed_at: null,
    documents: [],
    ...overrides,
  } as never;
}

describe('DisputesService', () => {
  const repo = {
    findById: jest.fn(),
    findByStripeId: jest.fn(),
    saveEvidence: jest.fn(),
    addDocument: jest.fn(),
    close: jest.fn(),
    applyOpened: jest.fn(),
    findActiveAdminEmails: jest.fn(),
    countOpen: jest.fn(),
  } as unknown as DisputesRepository;
  const stripe = {
    retrieveDispute: jest.fn(),
    updateDispute: jest.fn(),
    closeDispute: jest.fn(),
    uploadDisputeEvidence: jest.fn(),
  } as unknown as StripeService;
  const notifications = {
    sendDisputeOpened: jest.fn(),
  } as unknown as NotificationsService;
  const service = new DisputesService(repo, stripe, notifications);

  beforeEach(() => jest.clearAllMocks());

  it('syncs due_by from evidence_details and maps under_review to CLOSED', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(dispute());
    (stripe.retrieveDispute as jest.Mock).mockResolvedValue({
      status: 'under_review',
      evidence_details: { due_by: 1_800_000_000 },
    });

    await service.sync('dispute-1');

    expect(repo.saveEvidence).toHaveBeenCalledWith(
      'dispute-1',
      expect.objectContaining({
        status: DisputeStatus.CLOSED,
        evidence_due_by: new Date(1_800_000_000 * 1000),
      }),
    );
  });

  it.each([DisputeStatus.WON, DisputeStatus.LOST])(
    'fails closed for terminal state %s',
    async (status) => {
      (repo.findById as jest.Mock).mockResolvedValue(dispute({ status }));
      await expect(service.saveDraft('dispute-1', {})).rejects.toThrow(ConflictException);
    },
  );

  it('rejects evidence when deadline is missing', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(dispute({ evidence_due_by: null }));
    await expect(service.submit('dispute-1')).rejects.toThrow(ForbiddenException);
  });

  it('openCount returns the repository open total for the sidebar badge', async () => {
    (repo.countOpen as jest.Mock).mockResolvedValue(3);
    await expect(service.openCount()).resolves.toEqual({ open: 3 });
    expect(repo.countOpen).toHaveBeenCalledTimes(1);
  });

  it('syncFromWebhook maps under_review to CLOSED keyed by stripe id', async () => {
    (repo.findByStripeId as jest.Mock).mockResolvedValue(dispute());
    await service.syncFromWebhook({
      id: 'dp_1',
      status: 'under_review',
      evidence_details: { due_by: 1_800_000_000 },
    } as never);

    expect(repo.findByStripeId).toHaveBeenCalledWith('dp_1');
    expect(repo.saveEvidence).toHaveBeenCalledWith(
      'dispute-1',
      expect.objectContaining({
        status: DisputeStatus.CLOSED,
        evidence_due_by: new Date(1_800_000_000 * 1000),
      }),
    );
  });

  it.each(['won', 'lost'] as const)('syncFromWebhook closes on terminal %s', async (remote) => {
    (repo.findByStripeId as jest.Mock).mockResolvedValue(dispute());
    await service.syncFromWebhook({
      id: 'dp_1',
      status: remote,
      evidence_details: { due_by: null },
    } as never);

    expect(repo.close).toHaveBeenCalledWith(
      'dispute-1',
      remote === 'won' ? DisputeStatus.WON : DisputeStatus.LOST,
    );
  });

  it('submits typed uploaded document IDs with text evidence', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(
      dispute({
        documents: [
          {
            evidence_type: DisputeEvidenceType.SERVICE_DOCUMENTATION,
            stripe_file_id: 'file_1',
          },
        ],
      }),
    );
    (stripe.updateDispute as jest.Mock).mockResolvedValue({
      status: 'under_review',
      evidence_details: { due_by: 1_800_000_000 },
    });

    await service.submit('dispute-1');

    expect(stripe.updateDispute).toHaveBeenCalledWith(
      'dp_1',
      {
        evidence: {
          product_description: 'Ticket purchase',
          service_documentation: 'file_1',
        },
        submit: true,
      },
      expect.objectContaining({ operation: 'dispute_update' }),
    );
  });

  it('validates MIME, extension, magic bytes, size, and sanitizes filename', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(dispute());
    (stripe.uploadDisputeEvidence as jest.Mock).mockResolvedValue({ id: 'file_1' });
    (repo.addDocument as jest.Mock).mockResolvedValue({ id: 'document-1' });

    await service.upload(
      'dispute-1',
      DisputeEvidenceType.RECEIPT,
      {
        filename: '../invoice bad.pdf',
        mimetype: 'application/pdf',
        file: Readable.from(Buffer.from('%PDF-valid')),
      },
      'admin-1',
    );

    expect(repo.addDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        original_name: '.._invoice_bad.pdf',
        evidence_type: DisputeEvidenceType.RECEIPT,
        size: 10,
      }),
    );
  });

  it.each([
    ['invoice.png', 'application/pdf', Buffer.from('%PDF-valid')],
    ['invoice.pdf', 'application/pdf', Buffer.from('not-pdf')],
    ['invoice.pdf', 'text/plain', Buffer.from('%PDF-valid')],
  ])('rejects invalid upload %s (%s)', async (filename, mimetype, bytes) => {
    (repo.findById as jest.Mock).mockResolvedValue(dispute());
    await expect(
      service.upload(
        'dispute-1',
        DisputeEvidenceType.RECEIPT,
        { filename, mimetype, file: Readable.from(bytes) },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects files larger than 5MB before Stripe upload', async () => {
    (repo.findById as jest.Mock).mockResolvedValue(dispute());
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
    await expect(
      service.upload(
        'dispute-1',
        DisputeEvidenceType.RECEIPT,
        {
          filename: 'invoice.pdf',
          mimetype: 'application/pdf',
          file: Readable.from(oversized),
        },
        'admin-1',
      ),
    ).rejects.toThrow('Evidence exceeds 5MB');
    expect(stripe.uploadDisputeEvidence).not.toHaveBeenCalled();
  });
});
