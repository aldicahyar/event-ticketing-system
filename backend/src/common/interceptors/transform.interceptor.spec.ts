import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ url: '/disputes' }),
      getResponse: () => ({ statusCode: 200 }),
    }),
  } as unknown as ExecutionContext;

  it('preserves pagination metadata while unwrapping data', async () => {
    const handler: CallHandler = {
      handle: () => of({ data: [{ id: 'd-1' }], meta: { page: 1, total: 1 } }),
    };

    const result = await lastValueFrom(new TransformInterceptor().intercept(context, handler));

    expect(result.data).toEqual([{ id: 'd-1' }]);
    expect(result.meta).toEqual({ page: 1, total: 1 });
  });

  it('keeps primitive and array responses unchanged', async () => {
    const handler: CallHandler = { handle: () => of([{ id: 'd-1' }]) };

    const result = await lastValueFrom(new TransformInterceptor().intercept(context, handler));

    expect(result.data).toEqual([{ id: 'd-1' }]);
    expect(result.meta).toBeUndefined();
  });
});
