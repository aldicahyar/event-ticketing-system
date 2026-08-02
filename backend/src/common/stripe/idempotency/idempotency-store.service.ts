import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  DEFAULT_IDEMPOTENCY_TTL_HOURS,
  IDEMPOTENCY_CLEANUP_INTERVAL_MS,
  IDEMPOTENCY_TTL_CONFIG_KEY,
} from './idempotency.constants';

/** Snapshot of an idempotency record relevant to the caller. */
export interface IdempotencyRecord {
  status: 'IN_FLIGHT' | 'COMPLETED' | 'FAILED';
  resourceId: string | null;
}

/**
 * Persists idempotency key records and detects duplicate / in-flight requests.
 *
 * Single responsibility: own the `t_trx_idempotency_keys` table. It does not
 * generate keys and never calls Stripe.
 *
 * Reliability policy (aligned with the webhook event log):
 *  - Detecting an in-flight duplicate is **fail-closed** (throws 409) so a
 *    concurrent request cannot double-charge.
 *  - Recording success/failure is **fail-open**: a logging failure must not
 *    roll back a financial operation that already succeeded at Stripe.
 */
@Injectable()
export class IdempotencyStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdempotencyStoreService.name);
  private readonly ttlHours: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.ttlHours =
      Number(this.configService.get<string>(IDEMPOTENCY_TTL_CONFIG_KEY)) ||
      DEFAULT_IDEMPOTENCY_TTL_HOURS;
  }

  /**
   * Start the periodic purge of expired records. Keys are only meaningful for
   * Stripe's 24h window, so keeping them forever would grow the table without
   * bound (risk logged in the Phase 3 plan).
   */
  onModuleInit(): void {
    this.cleanupInterval = setInterval(
      () => void this.cleanupExpired(),
      IDEMPOTENCY_CLEANUP_INTERVAL_MS,
    );
    // Do not hold the event loop open just for the purge timer.
    this.cleanupInterval.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }

  /**
   * Delete records whose TTL has lapsed. Never throws: a failed purge must not
   * affect payment traffic.
   */
  async cleanupExpired(): Promise<number> {
    try {
      const { count } = await this.prisma.t_trx_idempotency_keys.deleteMany({
        where: { expires_at: { lt: new Date() } },
      });
      if (count > 0) {
        this.logger.log(`Purged ${count} expired idempotency key record(s)`);
      }
      return count;
    } catch (err) {
      this.logger.error(
        `cleanupExpired: purge failed: ${this.getErrorMessage(err)}`,
      );
      return 0;
    }
  }

  /**
   * Reserve a key before calling Stripe (INSERT-first). Behaviour:
   *  - No existing record  → create IN_FLIGHT, return null (caller proceeds).
   *  - COMPLETED record    → return it so the caller can replay resource_id.
   *  - IN_FLIGHT record     → another request is mid-flight → throw 409.
   *  - FAILED record        → allow retry: reset to IN_FLIGHT, return null.
   */
  async reserve(
    key: string,
    operation: string,
    entityId: string,
    fingerprint?: string,
  ): Promise<IdempotencyRecord | null> {
    try {
      await this.prisma.t_trx_idempotency_keys.create({
        data: {
          idempotency_key: key,
          operation,
          entity_id: entityId,
          fingerprint: fingerprint ?? null,
          status: 'IN_FLIGHT',
          expires_at: new Date(Date.now() + this.ttlHours * 60 * 60 * 1000),
        },
      });
      return null;
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        return this.handleExisting(key);
      }
      // Fail-open: if we cannot record the key, still allow the operation.
      // Stripe's own Idempotency-Key header remains the safety net.
      this.logger.warn(
        `reserve: could not persist key ${key}: ${this.getErrorMessage(err)}`,
      );
      return null;
    }
  }

  /** Mark a reserved key COMPLETED and store the resulting Stripe resource id. */
  async complete(key: string, resourceId: string): Promise<void> {
    try {
      await this.prisma.t_trx_idempotency_keys.updateMany({
        where: { idempotency_key: key },
        data: {
          status: 'COMPLETED',
          resource_id: resourceId,
          completed_at: new Date(),
          error_message: null,
        },
      });
    } catch (err) {
      this.logger.error(
        `complete: failed to mark key ${key} COMPLETED: ${this.getErrorMessage(err)}`,
      );
    }
  }

  /** Mark a reserved key FAILED so a later attempt can retry it. */
  async fail(key: string, errorMessage: string): Promise<void> {
    try {
      await this.prisma.t_trx_idempotency_keys.updateMany({
        where: { idempotency_key: key },
        data: {
          status: 'FAILED',
          completed_at: new Date(),
          error_message: errorMessage,
        },
      });
    } catch (err) {
      this.logger.error(
        `fail: failed to mark key ${key} FAILED: ${this.getErrorMessage(err)}`,
      );
    }
  }

  /**
   * Resolve behaviour when the key already exists (unique violation on insert).
   */
  private async handleExisting(key: string): Promise<IdempotencyRecord | null> {
    const existing = await this.prisma.t_trx_idempotency_keys.findUnique({
      where: { idempotency_key: key },
      select: { status: true, resource_id: true },
    });

    // Row vanished between insert and read (TTL cleanup race) — allow retry.
    if (!existing) return null;

    if (existing.status === 'COMPLETED') {
      return { status: 'COMPLETED', resourceId: existing.resource_id };
    }

    if (existing.status === 'FAILED') {
      // Previous attempt failed permanently — reset and allow a fresh try.
      await this.prisma.t_trx_idempotency_keys.updateMany({
        where: { idempotency_key: key },
        data: {
          status: 'IN_FLIGHT',
          error_message: null,
          completed_at: null,
        },
      });
      return null;
    }

    // IN_FLIGHT: a concurrent request owns this key. Fail-closed.
    throw new ConflictException(
      'A payment operation for this request is already in progress. Please wait a moment.',
    );
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    );
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }
}
