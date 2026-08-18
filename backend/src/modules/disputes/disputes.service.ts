import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DisputeEvidenceType, DisputeStatus, Prisma } from '@prisma/client';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import type Stripe from 'stripe';
import { StripeService } from '../../common/stripe/stripe.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DISPUTE_EVIDENCE_FIELDS,
  DISPUTE_TRANSITIONS,
  EVIDENCE_EXTENSIONS,
  EVIDENCE_MIME_TYPES,
  MAX_EVIDENCE_BYTES,
  STRIPE_FILE_EVIDENCE_FIELDS,
} from './disputes.constants';
import {
  DisputeDetail,
  DisputesRepository,
  OpenDisputeInput,
  OpenedDispute,
} from './disputes.repository';
import { SaveEvidenceDto } from './dto';

type EvidenceMimeType = (typeof EVIDENCE_MIME_TYPES)[number];
type EvidenceExtension = (typeof EVIDENCE_EXTENSIONS)[number];

export interface EvidenceUpload {
  filename: string;
  mimetype: string;
  file: Readable;
}

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    private readonly repo: DisputesRepository,
    private readonly stripe: StripeService,
    private readonly notifications: NotificationsService,
  ) {}

  list(status: DisputeStatus | undefined, page: number, limit: number) {
    return this.repo.list(status, page, limit);
  }

  /** Badge counter for the admin sidebar: how many disputes still need action. */
  async openCount(): Promise<{ open: number }> {
    return { open: await this.repo.countOpen() };
  }

  async detail(id: string): Promise<DisputeDetail> {
    const dispute = await this.repo.findById(id);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    return dispute;
  }

  async sync(id: string) {
    const local = await this.detail(id);
    const remote = await this.stripe.retrieveDispute(local.stripe_dispute_id);
    const status = this.mapStatus(remote.status);
    const update: Prisma.t_trx_disputesUncheckedUpdateInput = {
      evidence_due_by: this.unixDate(remote.evidence_details.due_by),
    };

    if (status === DisputeStatus.WON || status === DisputeStatus.LOST) {
      return this.repo.close(id, status);
    }
    if (local.status === DisputeStatus.WON || local.status === DisputeStatus.LOST) {
      throw new ConflictException('Terminal dispute cannot be reopened by sync');
    }

    update.status = status;
    if (status === DisputeStatus.CLOSED) {
      update.closed_at = local.closed_at ?? new Date();
    }
    return this.repo.saveEvidence(id, update);
  }

  async saveDraft(id: string, dto: SaveEvidenceDto) {
    const dispute = await this.detail(id);
    this.assertEvidenceEditable(dispute);

    const data: Prisma.t_trx_disputesUncheckedUpdateInput = {};
    for (const key of DISPUTE_EVIDENCE_FIELDS) {
      const value = dto[key];
      if (value === undefined) {
        continue;
      }
      data[`evidence_${key}`] = key === 'service_date' ? new Date(value) : value.trim();
    }
    return this.repo.saveEvidence(id, data);
  }

  async upload(
    id: string,
    evidenceType: DisputeEvidenceType,
    upload: EvidenceUpload,
    actorId: string,
  ) {
    const dispute = await this.detail(id);
    this.assertEvidenceEditable(dispute);

    const mimeType = this.assertMimeType(upload.mimetype);
    const filename = this.sanitizeFilename(upload.filename);
    this.assertExtension(filename, mimeType);
    const bytes = await this.readLimited(upload.file);
    if (!this.magicValid(mimeType, bytes)) {
      throw new BadRequestException('Evidence content does not match its MIME type');
    }

    const remote = await this.stripe.uploadDisputeEvidence(
      {
        purpose: 'dispute_evidence',
        file: { data: bytes, name: filename, type: mimeType },
      },
      {
        operation: 'dispute_evidence',
        entityId: id,
        discriminator: `${evidenceType}:${filename}`,
        fingerprint: { evidenceType, filename, size: bytes.length },
      },
    );

    return this.repo.addDocument({
      dispute_id: id,
      stripe_file_id: remote.id,
      evidence_type: evidenceType,
      original_name: filename,
      mime_type: mimeType,
      size: bytes.length,
      uploaded_by: actorId,
    });
  }

  async submit(id: string) {
    const dispute = await this.detail(id);
    this.assertEvidenceEditable(dispute);
    const evidence = this.buildStripeEvidence(dispute);
    if (Object.keys(evidence).length === 0) {
      throw new BadRequestException('At least one evidence field or document is required');
    }

    const remote = await this.stripe.updateDispute(
      dispute.stripe_dispute_id,
      { evidence, submit: true },
      {
        operation: 'dispute_update',
        entityId: id,
        discriminator: 'submit',
        fingerprint: { ...evidence },
      },
    );
    const status = this.mapStatus(remote.status);
    if (status === DisputeStatus.WON || status === DisputeStatus.LOST) {
      return this.repo.close(id, status);
    }

    return this.repo.saveEvidence(id, {
      evidence_submitted_at: new Date(),
      evidence_due_by: this.unixDate(remote.evidence_details.due_by),
      status,
      closed_at: status === DisputeStatus.CLOSED ? new Date() : undefined,
    });
  }

  async close(id: string) {
    const dispute = await this.detail(id);
    this.assertEvidenceEditable(dispute);
    const remote = await this.stripe.closeDispute(dispute.stripe_dispute_id, {
      operation: 'dispute_close',
      entityId: id,
      discriminator: 'close',
    });
    const outcome = this.mapStatus(remote.status);
    if (outcome === DisputeStatus.WON || outcome === DisputeStatus.LOST) {
      return this.repo.close(id, outcome);
    }

    return this.repo.saveEvidence(id, {
      status: DisputeStatus.CLOSED,
      closed_at: new Date(),
      evidence_due_by: this.unixDate(remote.evidence_details.due_by),
    });
  }

  async opened(data: OpenDisputeInput): Promise<OpenedDispute> {
    const result = await this.repo.applyOpened(data);
    if (result.created) {
      void this.notifyAdmin(result.dispute).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'unknown';
        this.logger.error(`Dispute notification failed: ${message}`);
      });
    }
    return result.dispute;
  }

  async resolved(stripeDisputeId: string, outcome: DisputeStatus) {
    const dispute = await this.repo.findByStripeId(stripeDisputeId);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    return this.repo.close(dispute.id, outcome);
  }

  /** Webhook counterpart of sync(): reconcile local dispute from a Stripe event, keyed by stripe id. */
  async syncFromWebhook(remote: Stripe.Dispute) {
    const dispute = await this.repo.findByStripeId(remote.id);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    const status = this.mapStatus(remote.status);
    if (status === DisputeStatus.WON || status === DisputeStatus.LOST) {
      return this.repo.close(dispute.id, status);
    }
    if (dispute.status === DisputeStatus.WON || dispute.status === DisputeStatus.LOST) {
      throw new ConflictException('Terminal dispute cannot be reopened by webhook');
    }
    return this.repo.saveEvidence(dispute.id, {
      status,
      evidence_due_by: this.unixDate(remote.evidence_details.due_by),
      closed_at: status === DisputeStatus.CLOSED ? (dispute.closed_at ?? new Date()) : undefined,
    });
  }

  private async notifyAdmin(dispute: OpenedDispute): Promise<void> {
    const admins = await this.repo.findActiveAdminEmails();
    await Promise.all(
      admins.map(({ email }) =>
        this.notifications.sendDisputeOpened(email, {
          disputeId: dispute.id,
          bookingCode: dispute.booking.booking_code,
          reason: dispute.reason ?? 'unspecified',
          amount: Number(dispute.amount),
          currency: dispute.currency,
          deadline: dispute.evidence_due_by?.toISOString() ?? null,
          link: `/dashboard/admin/disputes/${dispute.id}`,
        }),
      ),
    );
  }

  private assertEvidenceEditable(dispute: DisputeDetail): void {
    if (dispute.status !== DisputeStatus.OPEN) {
      throw new ConflictException('Evidence can only be changed while dispute is open');
    }
    this.assertTransition(dispute.status, DisputeStatus.OPEN);
    if (!dispute.evidence_due_by || dispute.evidence_due_by.getTime() <= Date.now()) {
      throw new ForbiddenException('Evidence deadline is missing or has passed');
    }
  }

  private assertTransition(from: DisputeStatus, to: DisputeStatus): void {
    if (!DISPUTE_TRANSITIONS[from].includes(to)) {
      throw new ConflictException(`Illegal dispute transition: ${from} -> ${to}`);
    }
  }

  private mapStatus(status: Stripe.Dispute.Status): DisputeStatus {
    const mapping: Record<Stripe.Dispute.Status, DisputeStatus> = {
      needs_response: DisputeStatus.OPEN,
      warning_needs_response: DisputeStatus.OPEN,
      under_review: DisputeStatus.CLOSED,
      warning_under_review: DisputeStatus.CLOSED,
      warning_closed: DisputeStatus.CLOSED,
      won: DisputeStatus.WON,
      lost: DisputeStatus.LOST,
    };
    return mapping[status];
  }

  private buildStripeEvidence(dispute: DisputeDetail): Stripe.DisputeUpdateParams.Evidence {
    const evidence: Stripe.DisputeUpdateParams.Evidence = {};
    this.assignEvidence(evidence, 'product_description', dispute.evidence_product_description);
    this.assignEvidence(evidence, 'customer_name', dispute.evidence_customer_name);
    this.assignEvidence(evidence, 'customer_email_address', dispute.evidence_customer_email);
    this.assignEvidence(
      evidence,
      'service_date',
      dispute.evidence_service_date?.toISOString().slice(0, 10),
    );
    this.assignEvidence(evidence, 'access_activity_log', dispute.evidence_access_activity);
    this.assignEvidence(evidence, 'uncategorized_text', dispute.evidence_uncategorized);
    for (const document of dispute.documents) {
      evidence[STRIPE_FILE_EVIDENCE_FIELDS[document.evidence_type]] = document.stripe_file_id;
    }
    return evidence;
  }

  private assignEvidence<K extends keyof Stripe.DisputeUpdateParams.Evidence>(
    evidence: Stripe.DisputeUpdateParams.Evidence,
    key: K,
    value: string | null | undefined,
  ): void {
    if (value) {
      evidence[key] = value;
    }
  }

  private unixDate(value: number | null): Date | null {
    return typeof value === 'number' && value > 0 ? new Date(value * 1000) : null;
  }

  private assertMimeType(value: string): EvidenceMimeType {
    if (!EVIDENCE_MIME_TYPES.includes(value as EvidenceMimeType)) {
      throw new BadRequestException('Unsupported evidence MIME type');
    }
    return value as EvidenceMimeType;
  }

  private assertExtension(filename: string, mimeType: EvidenceMimeType): void {
    const extension = extname(filename).toLowerCase() as EvidenceExtension;
    const allowedByMime: Record<EvidenceMimeType, readonly EvidenceExtension[]> = {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    };
    if (!EVIDENCE_EXTENSIONS.includes(extension) || !allowedByMime[mimeType].includes(extension)) {
      throw new BadRequestException('Evidence extension does not match its MIME type');
    }
  }

  private sanitizeFilename(filename: string): string {
    const sanitized = filename
      .replace(/[\\/]/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 255);
    if (!sanitized || sanitized === '.' || sanitized === '..') {
      throw new BadRequestException('Invalid evidence filename');
    }
    return sanitized;
  }

  private async readLimited(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of stream) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > MAX_EVIDENCE_BYTES) {
        throw new BadRequestException('Evidence exceeds 5MB');
      }
      chunks.push(bytes);
    }
    if (size === 0) {
      throw new BadRequestException('Evidence file is empty');
    }
    return Buffer.concat(chunks);
  }

  private magicValid(mimeType: EvidenceMimeType, bytes: Buffer): boolean {
    if (mimeType === 'application/pdf') {
      return bytes.subarray(0, 5).toString() === '%PDF-';
    }
    if (mimeType === 'image/png') {
      return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
    return bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  }
}
