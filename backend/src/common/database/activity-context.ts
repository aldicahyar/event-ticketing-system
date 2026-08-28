import { AsyncLocalStorage } from 'async_hooks';

/**
 * Actor context for activity logging: set per-request by ActorInterceptor from
 * the JWT, read by the Prisma activity-logging middleware.
 *
 * Empty store (seeds, migrations, webhooks) means the write is recorded with
 * actor_id = NULL, i.e. a system action.
 */
export const actorContext = new AsyncLocalStorage<string | undefined>();

export function getActor(): string | undefined {
  return actorContext.getStore();
}
