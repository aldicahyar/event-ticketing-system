import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';

/**
 * Structured audit logging service for payment-related actions.
 *
 * Records critical financial events (refunds, disputes, status overrides)
 * to the database for compliance, reconciliation, and debugging.
 * Unlike console logs, these records persist across restarts and
 * can be queried by finance/admin teams.
 *
 * Design: All methods are fire-and-forget — a logging failure must
 * never prevent a financial operation from completing.
 */
@Injectable()
export class PaymentAuditService {
  private readonly logger = new Logger('PaymentAudit');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a payment-related audit event.
   * Uses t_trx_security_logs with a structured metadata payload.
   *
   * @param userId  The user who triggered or is affected by the action
   * @param action  Machine-readable action code (e.g. 'REFUND_PROCESSED')
   * @param metadata  Structured details (amount, reason, booking_id, etc.)
   */
  async record(
    userId: string,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.t_trx_security_logs.create({
        data: {
          user_id: userId,
          action,
          metadata: metadata as object,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to record audit entry [${action}] for user ${userId}: ${this.getErrorMessage(err)}`,
      );
    }
  }

  /**
   * Record a system-initiated payment action (no specific user).
   * Used for automated processes like auto-refunds and webhook-triggered actions.
   */
  async recordSystemAction(
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.t_trx_security_logs.create({
        data: {
          // System actions use a sentinel user ID.
          // If this causes FK violation, fall back to logging only.
          user_id: metadata['user_id'] as string,
          action,
          metadata: metadata as object,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to record system audit [${action}]: ${this.getErrorMessage(err)}`,
      );
    }
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }
}
