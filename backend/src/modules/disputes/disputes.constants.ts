import { DisputeEvidenceType, DisputeStatus } from '@prisma/client';
import type Stripe from 'stripe';

export const DISPUTE_MENU_CODE = 'DISPUTES';

export const DISPUTE_TRANSITIONS: Readonly<Record<DisputeStatus, readonly DisputeStatus[]>> = {
  OPEN: [DisputeStatus.OPEN, DisputeStatus.CLOSED],
  CLOSED: [DisputeStatus.CLOSED, DisputeStatus.WON, DisputeStatus.LOST],
  WON: [],
  LOST: [],
};

export const DISPUTE_EVIDENCE_FIELDS = [
  'product_description',
  'customer_name',
  'customer_email',
  'service_date',
  'access_activity',
  'uncategorized',
] as const;

export const STRIPE_FILE_EVIDENCE_FIELDS: Readonly<
  Record<DisputeEvidenceType, keyof Stripe.DisputeUpdateParams.Evidence>
> = {
  CUSTOMER_COMMUNICATION: 'customer_communication',
  CUSTOMER_SIGNATURE: 'customer_signature',
  RECEIPT: 'receipt',
  REFUND_POLICY: 'refund_policy',
  SERVICE_DOCUMENTATION: 'service_documentation',
  UNCATEGORIZED_FILE: 'uncategorized_file',
};

export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;
export const EVIDENCE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'] as const;
