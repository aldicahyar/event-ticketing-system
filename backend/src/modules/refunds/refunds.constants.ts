/**
 * Rule codes for configurable refund policies (t_trx_refund_policies).
 *
 * The TIER MATCHING logic (which rule applies) lives in code; only the
 * percentage value and is_active flag are admin-editable via the UI.
 */
export const REFUND_RULE_CODES = {
  EVENT_CANCELLED: 'EVENT_CANCELLED',
  TIER_GT_7D: 'TIER_GT_7D',
  TIER_1_7D: 'TIER_1_7D',
  TIER_LT_24H: 'TIER_LT_24H',
} as const;

export type RefundRuleCode = (typeof REFUND_RULE_CODES)[keyof typeof REFUND_RULE_CODES];

/** Default seed values — admin can change these at runtime via the UI. */
export const DEFAULT_REFUND_POLICIES: ReadonlyArray<{
  rule_code: RefundRuleCode;
  label: string;
  percentage: number;
  priority: number;
}> = [
  {
    rule_code: 'EVENT_CANCELLED',
    label: 'Event cancelled by organizer',
    percentage: 100,
    priority: 0,
  },
  {
    rule_code: 'TIER_GT_7D',
    label: 'More than 7 days before event',
    percentage: 100,
    priority: 10,
  },
  { rule_code: 'TIER_1_7D', label: '1 to 7 days before event', percentage: 50, priority: 20 },
  {
    rule_code: 'TIER_LT_24H',
    label: 'Less than 24 hours / event passed',
    percentage: 0,
    priority: 30,
  },
];

/** Time-window boundaries (milliseconds) for tier evaluation. */
const MS_PER_DAY = 86_400_000;
export const TIER_GT_7D_MS = 7 * MS_PER_DAY;
export const TIER_LT_24H_MS = MS_PER_DAY;

/** Structured reason codes a user can select when requesting a refund. */
export const REFUND_REASONS = [
  'EVENT_CANCELLED',
  'SCHEDULE_CONFLICT',
  'CHANGE_OF_MIND',
  'DUPLICATE_PURCHASE',
  'OTHER',
] as const;

export type RefundReason = (typeof REFUND_REASONS)[number];

/**
 * Legal state-machine transitions for a refund request.
 * Any transition NOT listed here is rejected with ConflictException.
 */
export const REFUND_TRANSITIONS: Readonly<Record<string, ReadonlyArray<string>>> = {
  REQUESTED: ['PROCESSING', 'REJECTED'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  FAILED: ['PROCESSING'],
  COMPLETED: [],
  REJECTED: [],
};

/** Audit action codes for refund-related events. */
export const REFUND_AUDIT_ACTIONS = {
  REQUESTED: 'REFUND_REQUESTED',
  APPROVED: 'REFUND_APPROVED',
  REJECTED: 'REFUND_REJECTED',
  COMPLETED: 'REFUND_COMPLETED',
  FAILED: 'REFUND_FAILED',
  RETRIED: 'REFUND_RETRIED',
  POLICY_UPDATED: 'REFUND_POLICY_UPDATED',
} as const;
