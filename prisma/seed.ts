/**
 * RBAC Seed Script
 *
 * Usage:
 *   npx prisma db seed
 *   # or
 *   npx tsx prisma/seed.ts
 *
 * Idempotent: safe to run multiple times. Updates existing rows in place.
 *
 * Seeds:
 *   1. System roles (ADMIN, ORGANIZER, ATTENDEE) with isSystem=true
 *   2. Menus (mirrors frontend/src/config/navigation.ts)
 *   3. Permission matrix (role x menu x canView/canCreate/canEdit/canDelete)
 *   4. Re-link existing users to roleCode (defaults to ATTENDEE if old enum missing)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// 1. SYSTEM ROLES
// ============================================================
const SYSTEM_ROLES = [
  {
    code: 'ADMIN',
    name: 'Administrator',
    nameEn: 'Administrator',
    description: 'Full system access. Can manage roles, menus, and permissions.',
    sortOrder: 1,
  },
  {
    code: 'ORGANIZER',
    name: 'Organizer',
    nameEn: 'Organizer',
    description: 'Can create events and venues. Has personal orders and tickets.',
    sortOrder: 2,
  },
  {
    code: 'ATTENDEE',
    name: 'Attendee',
    nameEn: 'Attendee',
    description: 'Default role. Can browse events, place orders, and view tickets.',
    sortOrder: 3,
  },
] as const;

// ============================================================
// 2. MENUS
// ============================================================
// Mirror of frontend/src/config/navigation.ts.
// Keep in sync when adding new routes — see docs/plans/admin-sidebar-extension-triggers.md
const MENUS = [
  // ----- Admin: Dashboard group -----
  {
    code: 'DASHBOARD',
    name: 'Dashboard',
    nameEn: 'Dashboard',
    parentCode: null,
    icon: 'LayoutDashboard',
    slug: '/dashboard/admin',
    order: 1,
  },
  {
    code: 'DASHBOARD_STATS',
    name: 'Stats',
    nameEn: 'Stats',
    parentCode: 'DASHBOARD',
    icon: 'BarChart3',
    slug: '/dashboard/admin/stats',
    order: 1,
  },
  {
    code: 'DASHBOARD_ACTIVITY',
    name: 'Activity',
    nameEn: 'Activity',
    parentCode: 'DASHBOARD',
    icon: 'Activity',
    slug: '/dashboard/admin/activity',
    order: 2,
  },
  {
    code: 'DASHBOARD_OPS',
    name: 'Operations',
    nameEn: 'Operations',
    parentCode: 'DASHBOARD',
    icon: 'ClipboardList',
    slug: '/dashboard/admin/ops',
    order: 3,
  },

  // ----- Admin: Management -----
  {
    code: 'EVENTS',
    name: 'Manage Events',
    nameEn: 'Manage Events',
    parentCode: null,
    icon: 'Calendar',
    slug: '/dashboard/events',
    order: 2,
  },
  {
    code: 'VENUES',
    name: 'Manage Venues',
    nameEn: 'Manage Venues',
    parentCode: null,
    icon: 'MapPin',
    slug: '/dashboard/venues',
    order: 3,
  },
  {
    code: 'TIER_SETTINGS',
    name: 'Tier Settings',
    nameEn: 'Tier Settings',
    parentCode: null,
    icon: 'Layers',
    slug: '/dashboard/tier-settings',
    order: 4,
  },
  {
    code: 'TAX_SETTINGS',
    name: 'Tax Settings',
    nameEn: 'Tax Settings',
    parentCode: null,
    icon: 'Percent',
    slug: '/dashboard/tax-settings',
    order: 5,
  },
  // ----- Admin: Access Control group -----
  // Parent has no slug: it is a collapsible container, not a page.
  {
    code: 'RBAC',
    name: 'Access Control',
    nameEn: 'Access Control',
    parentCode: null,
    icon: 'ShieldCheck',
    slug: null,
    order: 6,
  },
  {
    code: 'USERS',
    name: 'Users',
    nameEn: 'Users',
    parentCode: 'RBAC',
    icon: 'Users',
    slug: '/dashboard/admin/users',
    order: 1,
  },
  {
    code: 'RBAC_ROLES',
    name: 'Roles',
    nameEn: 'Roles',
    parentCode: 'RBAC',
    icon: 'ShieldCheck',
    slug: '/dashboard/admin/rbac/roles',
    order: 2,
  },
  {
    code: 'RBAC_MENUS',
    name: 'Menus',
    nameEn: 'Menus',
    parentCode: 'RBAC',
    icon: 'Menu',
    slug: '/dashboard/admin/rbac/menus',
    order: 3,
  },
  {
    code: 'RBAC_PERMISSIONS',
    name: 'Permissions',
    nameEn: 'Permissions',
    parentCode: 'RBAC',
    icon: 'Lock',
    slug: '/dashboard/admin/rbac/permissions',
    order: 4,
  },

  // ----- Attendee/Organizer: Personal -----
  {
    code: 'OVERVIEW',
    name: 'Overview',
    nameEn: 'Overview',
    parentCode: null,
    icon: 'TrendingUp',
    slug: '/dashboard',
    order: 1,
  },
  {
    code: 'ORDERS',
    name: 'Orders',
    nameEn: 'Orders',
    parentCode: null,
    icon: 'CreditCard',
    slug: '/dashboard/orders',
    order: 2,
  },
  {
    code: 'MY_TICKETS',
    name: 'My Tickets',
    nameEn: 'My Tickets',
    parentCode: null,
    icon: 'Ticket',
    slug: '/dashboard/my-tickets',
    order: 3,
  },
  {
    code: 'PROFILE',
    name: 'Profile',
    nameEn: 'Profile',
    parentCode: null,
    icon: 'User',
    slug: '/dashboard/profile',
    order: 4,
  },
] as const;

// ============================================================
// 3. PERMISSION MATRIX
// ============================================================
// Each entry: [roleCode, menuCode, { canView, canCreate, canEdit, canDelete }]
const PERMISSION_MATRIX: Array<
  [string, string, { canView?: boolean; canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }]
> = [
  // ----- ADMIN: full access to admin area + RBAC -----
  ['ADMIN', 'DASHBOARD', { canView: true }],
  ['ADMIN', 'DASHBOARD_STATS', { canView: true }],
  ['ADMIN', 'DASHBOARD_ACTIVITY', { canView: true }],
  ['ADMIN', 'DASHBOARD_OPS', { canView: true }],
  ['ADMIN', 'EVENTS', { canView: true, canCreate: true, canEdit: true, canDelete: true }],
  ['ADMIN', 'VENUES', { canView: true, canCreate: true, canEdit: true, canDelete: true }],
  ['ADMIN', 'TIER_SETTINGS', { canView: true, canEdit: true }],
  ['ADMIN', 'TAX_SETTINGS', { canView: true, canEdit: true }],
  ['ADMIN', 'RBAC', { canView: true }],
  ['ADMIN', 'USERS', { canView: true, canCreate: true, canEdit: true, canDelete: true }],
  ['ADMIN', 'RBAC_ROLES', { canView: true, canCreate: true, canEdit: true, canDelete: true }],
  ['ADMIN', 'RBAC_MENUS', { canView: true, canCreate: true, canEdit: true, canDelete: true }],
  ['ADMIN', 'RBAC_PERMISSIONS', { canView: true, canEdit: true }],

  // ----- ORGANIZER: personal area + manage events/venues -----
  ['ORGANIZER', 'OVERVIEW', { canView: true }],
  ['ORGANIZER', 'ORDERS', { canView: true }],
  ['ORGANIZER', 'MY_TICKETS', { canView: true }],
  ['ORGANIZER', 'PROFILE', { canView: true, canEdit: true }],
  ['ORGANIZER', 'EVENTS', { canView: true, canCreate: true, canEdit: true, canDelete: true }],
  ['ORGANIZER', 'VENUES', { canView: true, canCreate: true, canEdit: true, canDelete: true }],

  // ----- ATTENDEE: personal area only -----
  ['ATTENDEE', 'OVERVIEW', { canView: true }],
  ['ATTENDEE', 'ORDERS', { canView: true }],
  ['ATTENDEE', 'MY_TICKETS', { canView: true }],
  ['ATTENDEE', 'PROFILE', { canView: true, canEdit: true }],
];

// ============================================================
// SEED EXECUTION
// ============================================================
async function main() {
  console.log('🌱 Starting RBAC seed...');

  // --- Roles ---
  console.log('→ Upserting system roles...');
  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        nameEn: role.nameEn,
        description: role.description,
        sortOrder: role.sortOrder,
        isSystem: true,
        isActive: true,
      },
      create: {
        code: role.code,
        name: role.name,
        nameEn: role.nameEn,
        description: role.description,
        sortOrder: role.sortOrder,
        isSystem: true,
        isActive: true,
        createdBy: 'system-seed',
      },
    });
  }

  // --- Menus ---
  console.log(`→ Upserting ${MENUS.length} menus...`);
  // First pass: upsert root menus (parentCode = null)
  const rootMenus = MENUS.filter((m) => m.parentCode === null);
  const childMenus = MENUS.filter((m) => m.parentCode !== null);

  for (const menu of rootMenus) {
    await prisma.menu.upsert({
      where: { code: menu.code },
      update: {
        name: menu.name,
        nameEn: menu.nameEn,
        icon: menu.icon,
        slug: menu.slug,
        order: menu.order,
        isActive: true,
      },
      create: {
        code: menu.code,
        name: menu.name,
        nameEn: menu.nameEn,
        parentCode: null,
        icon: menu.icon,
        slug: menu.slug,
        order: menu.order,
        isActive: true,
        createdBy: 'system-seed',
      },
    });
  }
  // Second pass: child menus
  for (const menu of childMenus) {
    await prisma.menu.upsert({
      where: { code: menu.code },
      update: {
        name: menu.name,
        nameEn: menu.nameEn,
        parentCode: menu.parentCode,
        icon: menu.icon,
        slug: menu.slug,
        order: menu.order,
        isActive: true,
      },
      create: {
        code: menu.code,
        name: menu.name,
        nameEn: menu.nameEn,
        parentCode: menu.parentCode,
        icon: menu.icon,
        slug: menu.slug,
        order: menu.order,
        isActive: true,
        createdBy: 'system-seed',
      },
    });
  }

  // --- Permissions ---
  console.log(`→ Upserting ${PERMISSION_MATRIX.length} permission cells...`);
  for (const [roleCode, menuCode, perms] of PERMISSION_MATRIX) {
    await prisma.roleMenuPermission.upsert({
      where: { roleCode_menuCode: { roleCode, menuCode } },
      update: {
        canView: perms.canView ?? false,
        canCreate: perms.canCreate ?? false,
        canEdit: perms.canEdit ?? false,
        canDelete: perms.canDelete ?? false,
        isActive: true,
      },
      create: {
        roleCode,
        menuCode,
        canView: perms.canView ?? false,
        canCreate: perms.canCreate ?? false,
        canEdit: perms.canEdit ?? false,
        canDelete: perms.canDelete ?? false,
        isActive: true,
        createdBy: 'system-seed',
      },
    });
  }

  // --- Users: migrate old enum role to roleCode ---
  // Skip updateMany with where clause because Prisma Client runtime cache
  // may not yet know about roleCode (regenerate cycle issue).
  // Instead, count users with empty roleCode and warn.
  console.log('→ Checking users without roleCode...');
  const orphanUsers = await prisma.user.count({
    where: { roleCode: { equals: '' } },
  });
  if (orphanUsers > 0) {
    console.log(`   ⚠️  Found ${orphanUsers} users with empty roleCode. Fixing...`);
    // Use raw SQL to avoid Prisma type cache issue
    await prisma.$executeRaw`UPDATE "users" SET "roleCode" = 'ATTENDEE' WHERE "roleCode" IS NULL OR "roleCode" = ''`;
  }

  // Summary
  const roleCount = await prisma.role.count();
  const menuCount = await prisma.menu.count();
  const permCount = await prisma.roleMenuPermission.count();
  console.log('\n✅ Seed complete!');
  console.log(`   Roles:       ${roleCount}`);
  console.log(`   Menus:       ${menuCount}`);
  console.log(`   Permissions: ${permCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
