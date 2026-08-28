import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { actorContext } from '../database/activity-context';

/**
 * Fills the AsyncLocalStorage actor context from the authenticated JWT so the
 * Prisma activity-logging extension can stamp `actor_id` on every write.
 *
 * Must run AFTER JwtAuthGuard (which sets `request.user`). It is safe to
 * register globally: when there is no authenticated user (public routes,
 * webhooks, seeds) the context stays empty and writes are logged with NULL.
 */
@Injectable()
export class ActorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = context.switchToHttp().getRequest().user;
    const userId: string | undefined = user?.id ?? user?.sub;
    // run() scopes the context to this request's async chain automatically.
    return actorContext.run(userId ? String(userId) : undefined, () => next.handle());
  }
}
