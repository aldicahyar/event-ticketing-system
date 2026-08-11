import { Test } from '@nestjs/testing';
import { RefundPolicyService } from './refund-policy.service';
import { PrismaService } from '../../common/database/prisma.service';

const DAY = 86_400_000;

function policyRows(overrides: Partial<Record<string, number>> = {}) {
  const values: Record<string, number> = {
    EVENT_CANCELLED: 100,
    TIER_GT_7D: 100,
    TIER_1_7D: 50,
    TIER_LT_24H: 0,
    ...overrides,
  };
  return Object.entries(values).map(([rule_code, percentage], priority) => ({
    rule_code,
    percentage,
    priority,
    is_active: true,
  }));
}

describe('RefundPolicyService', () => {
  let service: RefundPolicyService;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue(policyRows());
    const module = await Test.createTestingModule({
      providers: [
        RefundPolicyService,
        {
          provide: PrismaService,
          useValue: {
            t_trx_refund_policies: {
              findMany,
              upsert: jest.fn(),
            },
          },
        },
      ],
    }).compile();
    service = module.get(RefundPolicyService);
  });

  it('returns full refund for cancelled event regardless of date', async () => {
    const now = new Date('2026-08-02T00:00:00Z');
    const result = await service.evaluate(
      1_000_000,
      'CANCELLED',
      new Date(now.getTime() - DAY),
      now,
    );
    expect(result).toEqual({
      eligible: true,
      ruleCode: 'EVENT_CANCELLED',
      percentage: 100,
      amount: 1_000_000,
    });
  });

  it('returns full refund more than 7 days before event', async () => {
    const now = new Date('2026-08-02T00:00:00Z');
    const result = await service.evaluate(
      800_000,
      'PUBLISHED',
      new Date(now.getTime() + 8 * DAY),
      now,
    );
    expect(result.ruleCode).toBe('TIER_GT_7D');
    expect(result.amount).toBe(800_000);
  });

  it('returns configured partial refund between 1 and 7 days', async () => {
    const now = new Date('2026-08-02T00:00:00Z');
    const result = await service.evaluate(
      800_000,
      'PUBLISHED',
      new Date(now.getTime() + 3 * DAY),
      now,
    );
    expect(result).toEqual({
      eligible: true,
      ruleCode: 'TIER_1_7D',
      percentage: 50,
      amount: 400_000,
    });
  });

  it('is not eligible at exactly 24 hours', async () => {
    const now = new Date('2026-08-02T00:00:00Z');
    const result = await service.evaluate(800_000, 'PUBLISHED', new Date(now.getTime() + DAY), now);
    expect(result.ruleCode).toBe('TIER_LT_24H');
    expect(result.eligible).toBe(false);
  });

  it('applies an admin-updated percentage immediately after cache invalidation', async () => {
    const now = new Date('2026-08-02T00:00:00Z');
    await service.evaluate(800_000, 'PUBLISHED', new Date(now.getTime() + 3 * DAY), now);

    findMany.mockResolvedValue(policyRows({ TIER_1_7D: 75 }));
    service.invalidateCache();
    const updated = await service.evaluate(
      800_000,
      'PUBLISHED',
      new Date(now.getTime() + 3 * DAY),
      now,
    );

    expect(updated.percentage).toBe(75);
    expect(updated.amount).toBe(600_000);
    expect(findMany).toHaveBeenCalledTimes(2);
  });
});
