import { RefundStatus } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

function makeService(prisma: unknown, stripe: unknown): AnalyticsService {
  return new AnalyticsService(prisma as never, stripe as never);
}

describe('AnalyticsService', () => {
  describe('revenue', () => {
    it('aggregates GMV, net, rates and merges series across sources', async () => {
      const day = new Date('2026-08-01T00:00:00.000Z');
      const prisma = {
        // Order: gross, refunds, disputes, byEvent, byTier
        $queryRaw: jest
          .fn()
          .mockResolvedValueOnce([{ bucket: day, gross: 1000 }])
          .mockResolvedValueOnce([{ bucket: day, refunded: 200 }])
          .mockResolvedValueOnce([{ bucket: day, disputed: 100 }])
          .mockResolvedValueOnce([{ id: 'e1', title: 'Show', payments: 2, gross: 1000 }])
          .mockResolvedValueOnce([{ id: 't1', name: 'VIP', payments: 1, gross: 700 }]),
      };
      const service = makeService(prisma, {});

      const report = await service.revenue('daily');

      expect(report.gmv).toBe(1000);
      expect(report.refunded).toBe(200);
      expect(report.disputed).toBe(100);
      expect(report.net_revenue).toBe(700);
      expect(report.refund_rate).toBeCloseTo(0.2);
      expect(report.dispute_rate).toBeCloseTo(0.1);
      expect(report.series).toEqual([{ bucket: day.toISOString(), gross: 1000, net: 700 }]);
      expect(report.by_event[0]).toMatchObject({ key: 'e1', label: 'Show', gross: 1000 });
      expect(report.by_tier[0]).toMatchObject({ key: 't1', label: 'VIP', gross: 700 });
    });

    it('returns zero rates when there is no revenue', async () => {
      const prisma = { $queryRaw: jest.fn().mockResolvedValue([]) };
      const report = await makeService(prisma, {}).revenue('monthly');
      expect(report.gmv).toBe(0);
      expect(report.refund_rate).toBe(0);
      expect(report.dispute_rate).toBe(0);
      expect(report.series).toEqual([]);
    });
  });

  describe('refunds', () => {
    it('splits amounts by status', async () => {
      const prisma = {
        t_trx_refunds: {
          aggregate: jest.fn().mockResolvedValue({ _count: { id: 5 }, _sum: { amount: 500 } }),
          groupBy: jest.fn().mockResolvedValue([
            { status: RefundStatus.COMPLETED, _count: { id: 2 }, _sum: { amount: 300 } },
            { status: RefundStatus.REQUESTED, _count: { id: 1 }, _sum: { amount: 100 } },
            { status: RefundStatus.PROCESSING, _count: { id: 1 }, _sum: { amount: 50 } },
            { status: RefundStatus.FAILED, _count: { id: 1 }, _sum: { amount: 50 } },
          ]),
        },
      };
      const report = await makeService(prisma, {}).refunds();
      expect(report.total_requested).toBe(5);
      expect(report.completed_amount).toBe(300);
      expect(report.completed_count).toBe(2);
      expect(report.failed_amount).toBe(50);
      expect(report.in_progress_amount).toBe(150);
    });
  });

  describe('export', () => {
    it('computes net per transaction', async () => {
      const prisma = {
        $queryRaw: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            booking_code: 'BOK-1',
            event_title: 'Show',
            status: 'COMPLETED',
            provider: 'stripe',
            provider_tx_id: 'pi_1',
            currency: 'IDR',
            amount: 1000,
            paid_at: new Date('2026-08-01T10:00:00.000Z'),
            refunded: 200,
            disputed: 0,
          },
        ]),
      };
      const rows = await makeService(prisma, {}).export('2026-08-01', '2026-08-31');
      expect(rows[0].net_amount).toBe(800);
      expect(rows[0].provider).toBe('stripe');
    });

    it('rejects an inverted date range', async () => {
      const service = makeService({ $queryRaw: jest.fn() }, {});
      await expect(service.export('2026-08-31', '2026-08-01')).rejects.toThrow(
        '`from` must not be after `to`',
      );
    });
  });

  describe('reconciliation', () => {
    it('matches when DB GMV equals Stripe gross', async () => {
      const prisma = {
        t_trx_payments: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1000 } }) },
      };
      const stripe = {
        client: {
          balanceTransactions: {
            list: jest.fn().mockResolvedValue({
              data: [
                { id: 'txn_1', type: 'charge', amount: 100000, fee: 3000, created: 1 },
                { id: 'txn_2', type: 'payout', amount: 999999, fee: 0, created: 2 },
              ],
            }),
          },
        },
      };
      const result = await makeService(prisma, stripe).reconciliation('2026-08-01', '2026-08-10');
      expect(result.stripe_gross).toBe(1000);
      expect(result.stripe_fees).toBe(30);
      expect(result.difference).toBe(0);
      expect(result.status).toBe('MATCHED');
    });

    it('flags a mismatch beyond tolerance', async () => {
      const prisma = {
        t_trx_payments: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 500 } }) },
      };
      const stripe = {
        client: {
          balanceTransactions: {
            list: jest.fn().mockResolvedValue({
              data: [{ id: 't', type: 'charge', amount: 100000, fee: 0, created: 1 }],
            }),
          },
        },
      };
      const result = await makeService(prisma, stripe).reconciliation('2026-08-01', '2026-08-10');
      expect(result.status).toBe('MISMATCHED');
    });

    it('caps the reconciliation span at 31 days', async () => {
      const service = makeService({ t_trx_payments: { aggregate: jest.fn() } }, {});
      await expect(service.reconciliation('2026-01-01', '2026-06-01')).rejects.toThrow(
        'must not exceed 31 days',
      );
    });
  });

  describe('csvCell', () => {
    const service = makeService({}, {});
    it('quotes values containing commas, quotes and newlines', () => {
      expect(service.csvCell('a,b')).toBe('"a,b"');
      expect(service.csvCell('say "hi"')).toBe('"say ""hi"""');
      expect(service.csvCell('line1\nline2')).toBe('"line1\nline2"');
    });
    it('neutralises formula injection', () => {
      expect(service.csvCell('=1+1')).toBe("'=1+1");
      expect(service.csvCell('+A1')).toBe("'+A1");
    });
    it('passes plain values through', () => {
      expect(service.csvCell('BOK-1')).toBe('BOK-1');
      expect(service.csvCell(1000)).toBe('1000');
      expect(service.csvCell(null)).toBe('');
    });
  });
});

describe('AnalyticsController', () => {
  it('is restricted to ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AnalyticsController)).toEqual(['ADMIN']);
  });

  it('streams a CSV with header, BOM and escaped rows', async () => {
    const service = {
      export: jest.fn().mockResolvedValue([
        {
          payment_date: '2026-08-01T10:00:00.000Z',
          booking_code: 'BOK-1',
          event_title: 'Show, Live',
          status: 'COMPLETED',
          provider: 'stripe',
          provider_tx_id: 'pi_1',
          currency: 'IDR',
          amount: 1000,
          refunded_amount: 0,
          dispute_amount: 0,
          net_amount: 1000,
        },
      ]),
      csvCell: new AnalyticsService(null as never, null as never).csvCell,
    } as unknown as AnalyticsService;
    const controller = new AnalyticsController(service);
    const reply = { header: jest.fn(), send: jest.fn((body: string) => body) } as never;

    await controller.export({ from: '2026-08-01', to: '2026-08-31' }, reply);

    const sent = (reply as { send: jest.Mock }).send.mock.calls[0][0] as string;
    expect(sent.startsWith('\uFEFF')).toBe(true);
    expect(sent).toContain('booking_code');
    expect(sent).toContain('"Show, Live"');
    expect((reply as { header: jest.Mock }).header).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="payments-2026-08-01_2026-08-31.csv"',
    );
  });
});
