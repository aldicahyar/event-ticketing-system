export type DisputeStatus = 'OPEN' | 'CLOSED' | 'WON' | 'LOST';

export type DisputeEvidenceType =
  | 'CUSTOMER_COMMUNICATION'
  | 'CUSTOMER_SIGNATURE'
  | 'RECEIPT'
  | 'REFUND_POLICY'
  | 'SERVICE_DOCUMENTATION'
  | 'UNCATEGORIZED_FILE';

export interface DisputeDocument {
  id: string;
  dispute_id: string;
  stripe_file_id: string;
  evidence_type: DisputeEvidenceType;
  original_name: string;
  mime_type: string;
  size: number;
  uploaded_by: string;
  created_at: string;
}

export interface DisputePayment {
  id: string;
  booking_id: string;
  amount: string | number;
  currency: string;
  provider: string;
  provider_tx_id: string | null;
  status: string;
  payment_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisputeEvent {
  id: string;
  title: string;
  [key: string]: unknown;
}

export interface DisputeCustomer {
  id: string;
  name: string;
  email: string;
  [key: string]: unknown;
}

export interface DisputeBooking {
  id: string;
  user_id: string;
  event_id: string;
  booking_code: string;
  total_price: string | number;
  currency: string;
  status: string;
  booked_at: string;
  confirmed_at: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  event: DisputeEvent;
  user?: DisputeCustomer;
  tickets?: Array<{
    id: string;
    is_checked_in: boolean;
    revoked_at: string | null;
    revoked_reason: string | null;
  }>;
}

export interface DisputeSummary {
  id: string;
  payment_id: string;
  booking_id: string;
  stripe_dispute_id: string;
  amount: string | number;
  currency: string;
  reason: string | null;
  status: DisputeStatus;
  evidence_due_by: string | null;
  evidence_submitted_at: string | null;
  opened_at: string;
  closed_at: string | null;
  updated_at: string;
  booking: DisputeBooking;
  payment: DisputePayment;
  documents: DisputeDocument[];
}

export interface DisputeDetail extends DisputeSummary {
  evidence_product_description: string | null;
  evidence_customer_name: string | null;
  evidence_customer_email: string | null;
  evidence_service_date: string | null;
  evidence_access_activity: string | null;
  evidence_uncategorized: string | null;
}

export interface DisputeListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DisputeListResult {
  data: DisputeSummary[];
  meta?: DisputeListMeta;
}

export interface SaveEvidenceInput {
  product_description?: string;
  customer_name?: string;
  customer_email?: string;
  service_date?: string;
  access_activity?: string;
  uncategorized?: string;
}
