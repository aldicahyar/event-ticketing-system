import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  DEFAULT_REFUND_POLICIES,
  REFUND_RULE_CODES,
  TIER_GT_7D_MS,
  TIER_LT_24H_MS,
} from './refunds.constants';

/** Result of a policy evaluation for a specific booking + event. */
export interface PolicyEvaluation {
  eligible: boolean;
  ruleCode: string;
  percentage: number;
  amount: number;
}

interface PolicyRow {
  rule_code: string;
  percentage: number;
  priority: number;
  is_active: boolean;
}

/**
 * Pure tier-matching service for refund policies.
 *
 * The percentage values are loaded from t_trx_refund_policies (DB-driven,
 * editable by admin). The MATCHING logic (which tier applies) is deterministic
 * code, so admins can tune percentages without breaking evaluation rules.
 *
 * An in-memory cache avoids a DB hit on every evaluation; the cache is
 * invalidated whenever an admin updates a policy (see RefundsService.updatePolicy).
 */
@Injectable()
export class RefundPolicyService {
  private readonly logger = new Logger(RefundPolicyService.name);
  private cache: PolicyRow[] | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Force re-read of policies from DB (called after admin update). */
  invalidateCache(): void {
    this.cache = null;
  }

  private async loadPolicies(): Promise<PolicyRow[]> {
    if (this.cache) return this.cache;
    let rows = await this.prisma.t_trx_refund_policies.findMany({
      where: { is_active: true },
      orderBy: { priority: 'asc' },
      select: { rule_code: true, percentage: true, priority: true, is_active: true },
    });
    if (rows.length === 0) {
      await Promise.all(
        DEFAULT_REFUND_POLICIES.map((policy) =>
          this.prisma.t_trx_refund_policies.upsert({
            where: { rule_code: policy.rule_code },
            update: {},
            create: policy,
          }),
        ),
      );
      rows = await this.prisma.t_trx_refund_policies.findMany({
        where: { is_active: true },
        orderBy: { priority: 'asc' },
        select: { rule_code: true, percentage: true, priority: true, is_active: true },
      });
    }
    this.cache = rows;
    return rows;
  }

  private getPercentage(policies: PolicyRow[], ruleCode: string): number {
    const row = policies.find((p) => p.rule_code === ruleCode);
    return row?.percentage ?? 0;
  }

  /**
   * Evaluate the refund policy for a booking.
   *
   * @param totalPrice   booking.total_price (Decimal-compatible number)
   * @param eventStatus  event.status ('DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED')
   * @param eventStart   event.start_date_time
   * @param now          reference time (injectable for testing)
   */
  async evaluate(
    totalPrice: number,
    eventStatus: string,
    eventStart: Date,
    now: Date = new Date(),
  ): Promise<PolicyEvaluation> {
    const policies = await this.loadPolicies();

    // Event cancelled by organizer → full refund.
    if (eventStatus === 'CANCELLED') {
      return this.build(policies, REFUND_RULE_CODES.EVENT_CANCELLED, totalPrice);
    }

    const diffMs = eventStart.getTime() - now.getTime();

    if (diffMs > TIER_GT_7D_MS) {
      return this.build(policies, REFUND_RULE_CODES.TIER_GT_7D, totalPrice);
    }

    if (diffMs > TIER_LT_24H_MS) {
      return this.build(policies, REFUND_RULE_CODES.TIER_1_7D, totalPrice);
    }

    // Less than 24h or event already started → not eligible.
    return this.build(policies, REFUND_RULE_CODES.TIER_LT_24H, totalPrice);
  }

  private build(policies: PolicyRow[], ruleCode: string, totalPrice: number): PolicyEvaluation {
    const percentage = this.getPercentage(policies, ruleCode);
    const amount = Math.round((totalPrice * percentage) / 100);
    return {
      eligible: amount > 0,
      ruleCode,
      percentage,
      amount,
    };
  }
}
