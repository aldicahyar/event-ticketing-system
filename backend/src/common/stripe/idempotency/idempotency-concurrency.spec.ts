import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { IdempotencyKeyService } from './idempotency-key.service';
import { IdempotencyStoreService } from './idempotency-store.service';
import { StripeService } from '../stripe.service';
import { IdempotencyContext } from '../interfaces/idempotency.interface';

/**
 * Load verification for Phase 3 / GAP-05 (milestone M6).
 *
 * Acceptance criterion: a burst of 50 concurrent checkout attempts carrying an
 * identical payload must produce exactly ONE Stripe Checkout Session. Every
 * other attempt must be rejected with 409 (fail-closed) or replay the already
 * created session — never create a second one.
 *
 * The Stripe SDK is stubbed, so this exercises our own INSERT-first guard
 * rather than Stripe's server-side key handling. The database is replaced by an
 * in-memory table that reproduces the atomic unique-index behaviour of
 * `t_trx_idempotency_keys.idempotency_key`.
 */

const PARALLEL_REQUESTS = 50;
const STRIPE_LATENCY_MS = 5;

interface KeyRow {
  idempotency_key: string;
  status: 'IN_FLIGHT' | 'COMPLETED' | 'FAILED';
  resource_id: string | null;
  expires_at: Date;
}

/**
 * Minimal in-memory stand-in for the idempotency key table. `create` mirrors a
 * unique index: the existence check and the insert happen in the same
 * synchronous block, so two concurrent callers can never both win.
 */
function createInMemoryKeyTable() {
  const rows = new Map<string, KeyRow>();

  return {
    rows,
    t_trx_idempotency_keys: {
      create: jest.fn(async ({ data }: { data: KeyRow }) => {
        if (rows.has(data.idempotency_key)) {
          throw new Prisma.PrismaClientKnownRequestError('duplicate key', {
            code: 'P2002',
            clientVersion: 'test',
          });
        }
        rows.set(data.idempotency_key, { ...data });
        return data;
      }),
      findUnique: jest.fn(async ({ where }: { where: { idempotency_key: string } }) => {
        return rows.get(where.idempotency_key) ?? null;
      }),
      updateMany: jest.fn(
        async ({ where, data }: { where: { idempotency_key: string }; data: Partial<KeyRow> }) => {
          const row = rows.get(where.idempotency_key);
          if (!row) return { count: 0 };
          rows.set(where.idempotency_key, { ...row, ...data });
          return { count: 1 };
        },
      ),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
  };
}

function createConfigMock(): ConfigService {
  return {
    get: jest.fn((key: string) => {
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock';
      if (key === 'STRIPE_API_VERSION') return '2023-10-16';
      if (key === 'IDEMPOTENCY_KEY_TTL_HOURS') return '24';
      return undefined;
    }),
  } as unknown as ConfigService;
}

/** Same booking, same amount, same currency — one logical checkout attempt. */
function checkoutContext(): IdempotencyContext {
  return {
    operation: 'checkout',
    entityId: 'booking-load-test',
    discriminator: '1',
    fingerprint: { amount: 83250000, currency: 'idr' },
  };
}

describe('Idempotency load verification (GAP-05 M6)', () => {
  let db: ReturnType<typeof createInMemoryKeyTable>;
  let store: IdempotencyStoreService;
  let stripeService: StripeService;
  let createSession: jest.SpyInstance;

  beforeEach(() => {
    db = createInMemoryKeyTable();
    store = new IdempotencyStoreService(db as any, createConfigMock());
    stripeService = new StripeService(createConfigMock(), new IdempotencyKeyService(), store);

    let sessionCounter = 0;
    createSession = jest.spyOn(stripeService.client.checkout.sessions, 'create').mockImplementation(
      () =>
        new Promise((resolve) => {
          // Keep the winning request IN_FLIGHT long enough for the rest of
          // the burst to hit the guard, as a real Stripe round-trip would.
          setTimeout(
            () => resolve({ id: `cs_load_${++sessionCounter}` } as any),
            STRIPE_LATENCY_MS,
          );
        }) as any,
    );

    jest
      .spyOn(stripeService.client.checkout.sessions, 'retrieve')
      .mockImplementation((id: string) => Promise.resolve({ id } as any));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it(`creates exactly one Stripe session for ${PARALLEL_REQUESTS} parallel identical checkouts`, async () => {
    const results = await Promise.allSettled(
      Array.from({ length: PARALLEL_REQUESTS }, () =>
        stripeService.createCheckoutSession({} as any, checkoutContext()),
      ),
    );

    expect(createSession).toHaveBeenCalledTimes(1);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(PARALLEL_REQUESTS - 1);
    // Duplicates are refused, never silently charged twice.
    rejected.forEach((r) => expect(r.reason).toBeInstanceOf(ConflictException));

    // A single COMPLETED record holds the one session that was created.
    const rows = [...db.rows.values()];
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('COMPLETED');
    expect(rows[0].resource_id).toBe('cs_load_1');
  });

  it('replays the same session for retries arriving after completion', async () => {
    const first = await stripeService.createCheckoutSession({} as any, checkoutContext());

    const retries = await Promise.all(
      Array.from({ length: 10 }, () =>
        stripeService.createCheckoutSession({} as any, checkoutContext()),
      ),
    );

    expect(createSession).toHaveBeenCalledTimes(1);
    retries.forEach((session) => expect(session.id).toBe(first.id));
  });

  it('creates a separate session when the payload fingerprint changes', async () => {
    await stripeService.createCheckoutSession({} as any, checkoutContext());

    const changedAmount: IdempotencyContext = {
      ...checkoutContext(),
      fingerprint: { amount: 90000000, currency: 'idr' },
    };
    const second = await stripeService.createCheckoutSession({} as any, changedAmount);

    expect(createSession).toHaveBeenCalledTimes(2);
    expect(second.id).toBe('cs_load_2');
    expect(db.rows.size).toBe(2);
  });
});
