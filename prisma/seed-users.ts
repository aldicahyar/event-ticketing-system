/**
 * Seed test users with bcrypt-hashed password.
 *
 * Usage (from project root):
 *   npx tsx prisma/seed-users.ts
 *
 * Idempotent: existing users (by email) are skipped.
 *
 * Creates 3 users:
 *   admin@example.com    — ADMIN role
 *   organizer@example.com — ORGANIZER role
 *   john@example.com     — ATTENDEE role
 *
 * All use password: Admin123!
 * All are auto email_verified (skip OTP flow) for testing convenience.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TEST_USERS = [
  {
    email: 'admin@example.com',
    name: 'Admin User',
    role_code: 'ADMIN',
  },
  {
    email: 'organizer@example.com',
    name: 'Organizer User',
    role_code: 'ORGANIZER',
  },
  {
    email: 'john@example.com',
    name: 'John Doe',
    role_code: 'ATTENDEE',
  },
] as const;

const PASSWORD = 'Admin123!';
const BCRYPT_ROUNDS = 10;

async function main() {
  console.log('👥 Seeding test users...');
  console.log(`   Password for all: ${PASSWORD}\n`);

  const hashedPassword = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);

  for (const u of TEST_USERS) {
    const existing = await prisma.t_mtr_users.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`   ✓ ${u.email} already exists (role_code=${existing.role_code}), skipping`);
      continue;
    }

    const user = await prisma.t_mtr_users.create({
      data: {
        email: u.email,
        password: hashedPassword,
        name: u.name,
        role_code: u.role_code,
        is_active: true,
        email_verified: true, // skip OTP for test users
        last_login_at: null,
      },
      select: { id: true, email: true, name: true, role_code: true },
    });

    console.log(`   ✓ Created ${user.email}  (${user.role_code})  id=${user.id}`);
  }

  const count = await prisma.t_mtr_users.count();
  console.log(`\n✅ Done. Total users in DB: ${count}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
