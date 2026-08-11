import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { QueryDisputeDto } from './query-dispute.dto';

/**
 * Regression: HTTP query params arrive as strings. The DTO must coerce
 * them to numbers so @IsInt() passes, matching the real NestJS pipeline.
 */
describe('QueryDisputeDto (HTTP query string simulation)', () => {
  // NestJS ValidationPipe uses exactly these transformOptions
  function validateLikeNestJS(query: Record<string, unknown>) {
    const dto = plainToInstance(QueryDisputeDto, query, {
      enableImplicitConversion: true,
    });
    return { dto, errors: validateSync(dto) };
  }

  it('coerces string page and limit from HTTP query to valid integers (NestJS pipeline)', () => {
    const { dto, errors } = validateLikeNestJS({ page: '1', limit: '20' });
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('coerces string status filter with pagination without errors (NestJS pipeline)', () => {
    const { dto, errors } = validateLikeNestJS({
      status: 'OPEN',
      page: '2',
      limit: '10',
    });
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });

  it('applies defaults when query is empty (NestJS pipeline)', () => {
    const { dto, errors } = validateLikeNestJS({});
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('rejects page values below the minimum', () => {
    const { errors } = validateLikeNestJS({ page: '0' });
    expect(errors.some((error) => error.property === 'page')).toBe(true);
  });

  it('rejects limit values above the maximum', () => {
    const { errors } = validateLikeNestJS({ limit: '101' });
    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });
});
