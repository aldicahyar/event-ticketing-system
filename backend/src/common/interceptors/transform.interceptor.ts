import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T, M = unknown> {
  success: boolean;
  statusCode: number;
  data: T;
  meta?: M;
  message?: string;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  private readonly logger = new Logger(TransformInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((data: unknown) => {
        const payload = this.unwrapPayload(data);
        return {
          success: true,
          statusCode,
          data: payload.data,
          ...(payload.meta === undefined ? {} : { meta: payload.meta }),
          message: payload.message ?? 'Success',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }

  private unwrapPayload(data: unknown): { data: T; meta?: unknown; message?: string } {
    if (!this.isPayload(data)) {
      return { data: data as T };
    }
    return {
      data: data.data as T,
      meta: data.meta,
      message: data.message,
    };
  }

  private isPayload(data: unknown): data is { data: unknown; meta?: unknown; message?: string } {
    return typeof data === 'object' && data !== null && 'data' in data;
  }
}
