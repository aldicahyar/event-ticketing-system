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
 *   1. System roles (ADMIN, ORGANIZER, ATTENDEE) with is_system=true
 *   2. Menus (mirrors frontend/src/config/navigation.ts)
 *   3. Permission matrix (role x menu x can_view/can_create/can_edit/can_delete)
 *   4. Re-link existing users to role_code (defaults to ATTENDEE if old enum missing)
 *   5. Starter CMS pages (created only if missing)
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
    name_en: 'Administrator',
    description: 'Full system access. Can manage roles, menus, and permissions.',
    sort_order: 1,
  },
  {
    code: 'ORGANIZER',
    name: 'Organizer',
    name_en: 'Organizer',
    description: 'Can create events and venues. Has personal orders and tickets.',
    sort_order: 2,
  },
  {
    code: 'ATTENDEE',
    name: 'Attendee',
    name_en: 'Attendee',
    description: 'Default role. Can browse events, place orders, and view tickets.',
    sort_order: 3,
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
    name_en: 'Dashboard',
    parent_code: null,
    icon: 'LayoutDashboard',
    slug: '/dashboard/admin',
    order: 1,
  },
  {
    code: 'DASHBOARD_STATS',
    name: 'Stats',
    name_en: 'Stats',
    parent_code: 'DASHBOARD',
    icon: 'BarChart3',
    slug: '/dashboard/admin/stats',
    order: 1,
  },
  {
    code: 'DASHBOARD_ACTIVITY',
    name: 'Activity',
    name_en: 'Activity',
    parent_code: 'DASHBOARD',
    icon: 'Activity',
    slug: '/dashboard/admin/activity',
    order: 2,
  },
  {
    code: 'DASHBOARD_OPS',
    name: 'Operations',
    name_en: 'Operations',
    parent_code: 'DASHBOARD',
    icon: 'ClipboardList',
    slug: '/dashboard/admin/ops',
    order: 3,
  },

  // ----- Admin: Management -----
  {
    code: 'EVENTS',
    name: 'Manage Events',
    name_en: 'Manage Events',
    parent_code: null,
    icon: 'Calendar',
    slug: '/dashboard/events',
    order: 2,
  },
  {
    code: 'VENUES',
    name: 'Manage Venues',
    name_en: 'Manage Venues',
    parent_code: null,
    icon: 'MapPin',
    slug: '/dashboard/venues',
    order: 3,
  },
  {
    code: 'TIER_SETTINGS',
    name: 'Tier Settings',
    name_en: 'Tier Settings',
    parent_code: null,
    icon: 'Layers',
    slug: '/dashboard/tier-settings',
    order: 4,
  },
  {
    code: 'TAX_SETTINGS',
    name: 'Tax Settings',
    name_en: 'Tax Settings',
    parent_code: null,
    icon: 'Percent',
    slug: '/dashboard/tax-settings',
    order: 5,
  },
  {
    code: 'DISPUTES',
    name: 'Disputes',
    name_en: 'Disputes',
    parent_code: null,
    icon: 'AlertTriangle',
    slug: '/dashboard/admin/disputes',
    order: 7,
  },
  {
    code: 'REFUNDS',
    name: 'Refunds',
    name_en: 'Refunds',
    parent_code: null,
    icon: 'RotateCcw',
    slug: '/dashboard/refunds',
    order: 6,
  },
  {
    code: 'REFUND_POLICY_SETTINGS',
    name: 'Refund Policy Settings',
    name_en: 'Refund Policy Settings',
    parent_code: null,
    icon: 'SlidersHorizontal',
    slug: '/dashboard/admin/refund-policies',
    order: 7,
  },
  // ----- Admin: Access Control group -----
  // Parent has no slug: it is a collapsible container, not a page.
  {
    code: 'RBAC',
    name: 'Access Control',
    name_en: 'Access Control',
    parent_code: null,
    icon: 'ShieldCheck',
    slug: null,
    order: 6,
  },
  {
    code: 'USERS',
    name: 'Users',
    name_en: 'Users',
    parent_code: 'RBAC',
    icon: 'Users',
    slug: '/dashboard/admin/users',
    order: 1,
  },
  {
    code: 'RBAC_ROLES',
    name: 'Roles',
    name_en: 'Roles',
    parent_code: 'RBAC',
    icon: 'ShieldCheck',
    slug: '/dashboard/admin/rbac/roles',
    order: 2,
  },
  {
    code: 'RBAC_MENUS',
    name: 'Menus',
    name_en: 'Menus',
    parent_code: 'RBAC',
    icon: 'Menu',
    slug: '/dashboard/admin/rbac/menus',
    order: 3,
  },
  {
    code: 'RBAC_PERMISSIONS',
    name: 'Permissions',
    name_en: 'Permissions',
    parent_code: 'RBAC',
    icon: 'Lock',
    slug: '/dashboard/admin/rbac/permissions',
    order: 4,
  },

  // ----- Admin: Content (CMS) group -----
  // Parent has no slug: collapsible container only.
  {
    code: 'CONTENT',
    name: 'Content',
    name_en: 'Content',
    parent_code: null,
    icon: 'LayoutTemplate',
    slug: null,
    order: 7,
  },
  {
    code: 'MEDIA',
    name: 'Media',
    name_en: 'Media',
    parent_code: 'CONTENT',
    icon: 'Image',
    slug: '/dashboard/admin/media',
    order: 1,
  },
  {
    code: 'PAGES',
    name: 'Pages',
    name_en: 'Pages',
    parent_code: 'CONTENT',
    icon: 'FileText',
    slug: '/dashboard/admin/pages',
    order: 2,
  },

  // ----- Attendee/Organizer: Personal -----
  {
    code: 'OVERVIEW',
    name: 'Overview',
    name_en: 'Overview',
    parent_code: null,
    icon: 'TrendingUp',
    slug: '/dashboard',
    order: 1,
  },
  {
    code: 'ORDERS',
    name: 'Orders',
    name_en: 'Orders',
    parent_code: null,
    icon: 'CreditCard',
    slug: '/dashboard/orders',
    order: 2,
  },
  {
    code: 'MY_TICKETS',
    name: 'My Tickets',
    name_en: 'My Tickets',
    parent_code: null,
    icon: 'Ticket',
    slug: '/dashboard/my-tickets',
    order: 3,
  },
  {
    code: 'PROFILE',
    name: 'Profile',
    name_en: 'Profile',
    parent_code: null,
    icon: 'User',
    slug: '/dashboard/profile',
    order: 4,
  },
] as const;

// ============================================================
// 3. PERMISSION MATRIX
// ============================================================
// Each entry: [role_code, menu_code, { can_view, can_create, can_edit, can_delete }]
const PERMISSION_MATRIX: Array<
  [string, string, { can_view?: boolean; can_create?: boolean; can_edit?: boolean; can_delete?: boolean }]
> = [
  // ----- ADMIN: full access to admin area + RBAC -----
  ['ADMIN', 'DASHBOARD', { can_view: true }],
  ['ADMIN', 'DASHBOARD_STATS', { can_view: true }],
  ['ADMIN', 'DASHBOARD_ACTIVITY', { can_view: true }],
  // can_edit gates the admin-initiated refund action on the Ops page.
  ['ADMIN', 'DASHBOARD_OPS', { can_view: true, can_edit: true }],
  ['ADMIN', 'EVENTS', { can_view: true, can_create: true, can_edit: true, can_delete: true }],
  ['ADMIN', 'VENUES', { can_view: true, can_create: true, can_edit: true, can_delete: true }],
  ['ADMIN', 'TIER_SETTINGS', { can_view: true, can_edit: true }],
  ['ADMIN', 'TAX_SETTINGS', { can_view: true, can_edit: true }],
  ['ADMIN', 'REFUNDS', { can_view: true, can_edit: true }],
  ['ADMIN', 'DISPUTES', { can_view: true, can_edit: true }],
  ['ADMIN', 'REFUND_POLICY_SETTINGS', { can_view: true, can_edit: true }],
  ['ADMIN', 'RBAC', { can_view: true }],
  ['ADMIN', 'USERS', { can_view: true, can_create: true, can_edit: true, can_delete: true }],
  ['ADMIN', 'RBAC_ROLES', { can_view: true, can_create: true, can_edit: true, can_delete: true }],
  ['ADMIN', 'RBAC_MENUS', { can_view: true, can_create: true, can_edit: true, can_delete: true }],
  ['ADMIN', 'RBAC_PERMISSIONS', { can_view: true, can_edit: true }],
  // CMS
  ['ADMIN', 'CONTENT', { can_view: true }],
  ['ADMIN', 'MEDIA', { can_view: true, can_create: true, can_edit: true, can_delete: true }],
  ['ADMIN', 'PAGES', { can_view: true, can_create: true, can_edit: true, can_delete: true }],

  // ----- ORGANIZER: personal area + manage events/venues -----
  ['ORGANIZER', 'OVERVIEW', { can_view: true }],
  ['ORGANIZER', 'ORDERS', { can_view: true }],
  ['ORGANIZER', 'MY_TICKETS', { can_view: true }],
  ['ORGANIZER', 'PROFILE', { can_view: true, can_edit: true }],
  ['ORGANIZER', 'EVENTS', { can_view: true, can_create: true, can_edit: true, can_delete: true }],
  ['ORGANIZER', 'VENUES', { can_view: true, can_create: true, can_edit: true, can_delete: true }],
  ['ORGANIZER', 'REFUNDS', { can_view: true, can_edit: true }],

  // ----- ATTENDEE: personal area only -----
  ['ATTENDEE', 'OVERVIEW', { can_view: true }],
  ['ATTENDEE', 'ORDERS', { can_view: true }],
  ['ATTENDEE', 'MY_TICKETS', { can_view: true }],
  ['ATTENDEE', 'PROFILE', { can_view: true, can_edit: true }],
];

// ============================================================
// 4. STARTER CMS PAGES (created only if missing — never overwrites edits)
// ============================================================
const STARTER_PAGES = [
  {
    slug: 'about',
    title: 'About Us',
    excerpt: 'Learn more about our event ticketing platform.',
    content:
      '<h2>About Us</h2><p>Welcome to our platform. Edit this page from the admin <strong>Content &rarr; Pages</strong> menu.</p>',
  },
  {
    slug: 'faq',
    title: 'Frequently Asked Questions',
    excerpt: 'Answers to common questions.',
    content: '<h2>FAQ</h2><p>Add your frequently asked questions here.</p>',
  },
] as const;

// ============================================================
// SEED EXECUTION
// ============================================================
async function main() {
  console.log('🌱 Starting RBAC seed...');

  // --- Roles ---
  console.log('→ Upserting system roles...');
  for (const role of SYSTEM_ROLES) {
    await prisma.t_mtr_roles.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        name_en: role.name_en,
        description: role.description,
        sort_order: role.sort_order,
        is_system: true,
        is_active: true,
      },
      create: {
        code: role.code,
        name: role.name,
        name_en: role.name_en,
        description: role.description,
        sort_order: role.sort_order,
        is_system: true,
        is_active: true,
        created_by: 'system-seed',
      },
    });
  }

  // --- Menus ---
  console.log(`→ Upserting ${MENUS.length} menus...`);
  // First pass: upsert root menus (parent_code = null)
  const rootMenus = MENUS.filter((m) => m.parent_code === null);
  const childMenus = MENUS.filter((m) => m.parent_code !== null);

  for (const menu of rootMenus) {
    await prisma.t_mtr_menus.upsert({
      where: { code: menu.code },
      update: {
        name: menu.name,
        name_en: menu.name_en,
        icon: menu.icon,
        slug: menu.slug,
        order: menu.order,
        is_active: true,
      },
      create: {
        code: menu.code,
        name: menu.name,
        name_en: menu.name_en,
        parent_code: null,
        icon: menu.icon,
        slug: menu.slug,
        order: menu.order,
        is_active: true,
        created_by: 'system-seed',
      },
    });
  }
  // Second pass: child menus
  for (const menu of childMenus) {
    await prisma.t_mtr_menus.upsert({
      where: { code: menu.code },
      update: {
        name: menu.name,
        name_en: menu.name_en,
        parent_code: menu.parent_code,
        icon: menu.icon,
        slug: menu.slug,
        order: menu.order,
        is_active: true,
      },
      create: {
        code: menu.code,
        name: menu.name,
        name_en: menu.name_en,
        parent_code: menu.parent_code,
        icon: menu.icon,
        slug: menu.slug,
        order: menu.order,
        is_active: true,
        created_by: 'system-seed',
      },
    });
  }

  // --- Permissions ---
  console.log(`→ Upserting ${PERMISSION_MATRIX.length} permission cells...`);
  for (const [role_code, menu_code, perms] of PERMISSION_MATRIX) {
    await prisma.t_mtr_role_menu_permissions.upsert({
      where: { role_code_menu_code: { role_code, menu_code } },
      update: {
        can_view: perms.can_view ?? false,
        can_create: perms.can_create ?? false,
        can_edit: perms.can_edit ?? false,
        can_delete: perms.can_delete ?? false,
        is_active: true,
      },
      create: {
        role_code,
        menu_code,
        can_view: perms.can_view ?? false,
        can_create: perms.can_create ?? false,
        can_edit: perms.can_edit ?? false,
        can_delete: perms.can_delete ?? false,
        is_active: true,
        created_by: 'system-seed',
      },
    });
  }

  // --- Users: migrate old enum role to role_code ---
  // Skip updateMany with where clause because Prisma Client runtime cache
  // may not yet know about role_code (regenerate cycle issue).
  // Instead, count users with empty role_code and warn.
  console.log('→ Checking users without role_code...');
  const orphanUsers = await prisma.t_mtr_users.count({
    where: { role_code: { equals: '' } },
  });
  if (orphanUsers > 0) {
    console.log(`   ⚠️  Found ${orphanUsers} users with empty role_code. Fixing...`);
    // Use raw SQL to avoid Prisma type cache issue
    await prisma.$executeRaw`UPDATE "users" SET "role_code" = 'ATTENDEE' WHERE "role_code" IS NULL OR "role_code" = ''`;
  }

  // --- Starter CMS pages ---
  console.log('→ Ensuring starter CMS pages...');
  for (const p of STARTER_PAGES) {
    const exists = await prisma.t_mtr_pages.findUnique({ where: { slug: p.slug } });
    if (!exists) {
      await prisma.t_mtr_pages.create({
        data: {
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          content: p.content,
          status: 'PUBLISHED',
          published_at: new Date(),
          created_by: 'system-seed',
          updated_by: 'system-seed',
        },
      });
      console.log(`   + created page '${p.slug}'`);
    }
  }

  // Summary
  const roleCount = await prisma.t_mtr_roles.count();
  const menuCount = await prisma.t_mtr_menus.count();
  const permCount = await prisma.t_mtr_role_menu_permissions.count();
  const pageCount = await prisma.t_mtr_pages.count();
  console.log('\n✅ Seed complete!');
  console.log(`   Roles:       ${roleCount}`);
  console.log(`   Menus:       ${menuCount}`);
  console.log(`   Permissions: ${permCount}`);
  console.log(`   Pages:       ${pageCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
