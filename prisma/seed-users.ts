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
 * All are auto emailVerified (skip OTP flow) for testing convenience.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TEST_USERS = [
  {
    email: 'admin@example.com',
    name: 'Admin User',
    roleCode: 'ADMIN',
  },
  {
    email: 'organizer@example.com',
    name: 'Organizer User',
    roleCode: 'ORGANIZER',
  },
  {
    email: 'john@example.com',
    name: 'John Doe',
    roleCode: 'ATTENDEE',
  },
] as const;

const PASSWORD = 'Admin123!';
const BCRYPT_ROUNDS = 10;

async function main() {
  console.log('👥 Seeding test users...');
  console.log(`   Password for all: ${PASSWORD}\n`);

  const hashedPassword = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);

  for (const u of TEST_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`   ✓ ${u.email} already exists (roleCode=${existing.roleCode}), skipping`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: u.email,
        password: hashedPassword,
        name: u.name,
        roleCode: u.roleCode,
        isActive: true,
        emailVerified: true, // skip OTP for test users
        lastLoginAt: null,
      },
      select: { id: true, email: true, name: true, roleCode: true },
    });

    console.log(`   ✓ Created ${user.email}  (${user.roleCode})  id=${user.id}`);
  }

  const count = await prisma.user.count();
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
