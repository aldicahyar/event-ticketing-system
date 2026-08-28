/**
 * Backfill script for t_trx_activity_log
 *
 * Populates historical activity feed entries from:
 *   1. t_trx_bookings (booked_at) -> CREATE t_trx_bookings
 *   2. t_trx_payments (paid_at/created_at) -> UPDATE t_trx_payments
 *   3. t_mtr_users (created_at) -> CREATE t_mtr_users
 *   4. t_trx_security_logs -> mirrored as activity log entries
 *
 * Usage:
 *   npx ts-node prisma/backfill-activity.ts [--dry-run]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`🚀 Starting activity log backfill ${isDryRun ? '(DRY RUN)' : ''}...`);

  // Idempotency: refuse to run twice (metadata.backfilled marks our rows).
  const already = await prisma.t_trx_activity_log.count({
    where: { metadata: { path: ['backfilled'], equals: true } },
  });
  if (already > 0 && !isDryRun) {
    console.log(`⏭️  ${already} backfilled rows already present — nothing to do.`);
    return;
  }

  let insertedCount = 0;

  // 1. Bookings
  const bookings = await prisma.t_trx_bookings.findMany({
    select: { id: true, user_id: true, booked_at: true },
  });
  console.log(`→ Found ${bookings.length} historical bookings...`);
  for (const b of bookings) {
    if (!isDryRun) {
      await prisma.t_trx_activity_log.create({
        data: {
          actor_id: b.user_id,
          action: 'CREATE',
          model: 't_trx_bookings',
          target_id: b.id,
          target_type: 't_trx_bookings',
          metadata: { backfilled: true, source: 'historical_bookings' },
          created_at: b.booked_at,
        },
      });
    }
    insertedCount++;
  }

  // 2. Payments
  const payments = await prisma.t_trx_payments.findMany({
    select: { id: true, status: true, paid_at: true, created_at: true, booking: { select: { user_id: true } } },
  });
  console.log(`→ Found ${payments.length} historical payments...`);
  for (const p of payments) {
    if (!isDryRun) {
      await prisma.t_trx_activity_log.create({
        data: {
          actor_id: p.booking.user_id,
          action: p.status === 'COMPLETED' ? 'UPDATE' : 'CREATE',
          model: 't_trx_payments',
          target_id: p.id,
          target_type: 't_trx_payments',
          metadata: { backfilled: true, status: p.status },
          created_at: p.paid_at ?? p.created_at,
        },
      });
    }
    insertedCount++;
  }

  // 3. Users
  const users = await prisma.t_mtr_users.findMany({ select: { id: true, created_at: true } });
  console.log(`→ Found ${users.length} historical users...`);
  for (const u of users) {
    if (!isDryRun) {
      await prisma.t_trx_activity_log.create({
        data: {
          actor_id: u.id,
          action: 'CREATE',
          model: 't_mtr_users',
          target_id: u.id,
          target_type: 't_mtr_users',
          metadata: { backfilled: true },
          created_at: u.created_at,
        },
      });
    }
    insertedCount++;
  }

  // 4. Security logs
  const securityLogs = await prisma.t_trx_security_logs.findMany({
    select: { id: true, user_id: true, action: true, created_at: true },
  });
  console.log(`→ Found ${securityLogs.length} historical security logs...`);
  for (const s of securityLogs) {
    if (!isDryRun) {
      await prisma.t_trx_activity_log.create({
        data: {
          actor_id: s.user_id,
          action: 'UPDATE',
          model: 't_trx_security_logs',
          target_id: s.id,
          target_type: 't_trx_security_logs',
          metadata: { backfilled: true, original_action: s.action },
          created_at: s.created_at,
        },
      });
    }
    insertedCount++;
  }

  console.log(
    `\n✅ Backfill completed! ${insertedCount} log entries ${isDryRun ? 'would be inserted' : 'inserted'}.`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
