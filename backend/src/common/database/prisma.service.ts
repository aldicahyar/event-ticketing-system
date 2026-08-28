import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { getActor } from './activity-context';

/** Write operations that produce an activity entry. */
const TRACKED_ACTIONS: Record<string, 'CREATE' | 'UPDATE' | 'DELETE'> = {
  create: 'CREATE',
  createMany: 'CREATE',
  update: 'UPDATE',
  updateMany: 'UPDATE',
  upsert: 'UPDATE',
  delete: 'DELETE',
  deleteMany: 'DELETE',
};

/**
 * Models excluded from activity logging to avoid noise and infinite loops:
 * - the activity log itself, webhook events, security logs (already audited),
 * - session/token churn tables.
 */
const EXCLUDED_MODELS = new Set<string>([
  't_trx_activity_log',
  't_trx_webhook_events',
  't_trx_security_logs',
  't_trx_oauth_accounts',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });
    this.registerActivityLogging();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connected successfully');

    this.$on('query' as never, (e: any) => {
      this.logger.debug(`Query: ${e.query}`);
      this.logger.debug(`Duration: ${e.duration}ms`);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Cross-domain activity logging: every write to a tracked model appends a
   * row to t_trx_activity_log, stamped with the current actor (or NULL for
   * system/webhook actions). Fire-and-forget — a logging failure must never
   * roll back the business operation.
   */
  private registerActivityLogging() {
    this.$use(async (params, next) => {
      const result = await next(params);

      const action = params.action ? TRACKED_ACTIONS[params.action] : undefined;
      const model = params.model;
      if (!action || !model || EXCLUDED_MODELS.has(model)) {
        return result;
      }

      // Resolve the affected id(s) from the result when available.
      const targetId = this.extractTargetId(result);
      void this.writeActivity(action, model, targetId, params.action).catch((err) =>
        this.logger.error(`Activity log failed [${action} ${model}]: ${String(err)}`),
      );

      return result;
    });
  }

  private extractTargetId(result: unknown): string {
    if (result && typeof result === 'object') {
      const record = result as Record<string, unknown>;
      if (typeof record.id === 'string') return record.id;
      // Batch operations (updateMany/deleteMany) return { count }.
      if (typeof record.count === 'number') return `count:${record.count}`;
    }
    return 'unknown';
  }

  private async writeActivity(
    action: string,
    model: string,
    targetId: string,
    rawAction: string,
  ): Promise<void> {
    await this.t_trx_activity_log.create({
      data: {
        actor_id: getActor() ?? null,
        action,
        model,
        target_id: targetId,
        target_type: model,
        metadata: { operation: rawAction } as Prisma.InputJsonValue,
      },
    });
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;

    const models = Reflect.ownKeys(this).filter(
      (key): key is string =>
        typeof key === 'string' && !key.startsWith('_') && typeof (this as any)[key] === 'object',
    );

    return Promise.all(
      models.map((modelKey) => {
        const model = (this as any)[modelKey];
        if (model && typeof model.deleteMany === 'function') {
          return model.deleteMany();
        }
      }),
    );
  }
}
