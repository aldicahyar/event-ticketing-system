import {
  LayoutDashboard, BarChart3, Activity, ClipboardList,
  Calendar, MapPin, Layers, Percent,
  ShieldCheck, Users, Menu as MenuIcon, Lock,
  Image as ImageIcon, FileText, LayoutTemplate,
  CreditCard, Ticket, User, TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * Optional sub-items. If provided, the parent becomes a collapsible group.
   *
   * WHEN TO ADD `children`:
   *   1. The menu has >= 2 sub-pages sharing a URL prefix (e.g. /events + /events/categories)
   *   2. The sub-section has its own workflow (Drafts vs Published events)
   *   3. User research shows people struggle to find a feature within 2 clicks
   *
   * WHEN NOT TO ADD `children`:
   *   - Filter/category concerns that fit better as tabs on a single page
   *   - Only one child exists (just rename the parent label)
   *   - The sub-page does not exist yet (avoid speculative structure)
   *
   * See: docs/plans/admin-sidebar-extension-triggers.md
   */
  children?: NavItem[];
  /** Minimum role required to see this item. Defaults to ATTENDEE. */
  requiredRole?: 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';
}

export const ADMIN_NAV: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard/admin',
    icon: LayoutDashboard,
    children: [
      { label: 'Stats', href: '/dashboard/admin/stats', icon: BarChart3, requiredRole: 'ADMIN' },
      { label: 'Activity', href: '/dashboard/admin/activity', icon: Activity, requiredRole: 'ADMIN' },
      { label: 'Operations', href: '/dashboard/admin/ops', icon: ClipboardList, requiredRole: 'ADMIN' },
    ],
  },
  { label: 'Manage Events', href: '/dashboard/events', icon: Calendar, requiredRole: 'ADMIN' },
  { label: 'Manage Venues', href: '/dashboard/venues', icon: MapPin, requiredRole: 'ADMIN' },
  { label: 'Tier Settings', href: '/dashboard/tier-settings', icon: Layers, requiredRole: 'ADMIN' },
  { label: 'Tax Settings', href: '/dashboard/tax-settings', icon: Percent, requiredRole: 'ADMIN' },
  {
    // Mirrors the RBAC menu group seeded in prisma/seed.ts.
    // Parent is a container only — /dashboard/admin/rbac has no page of its own.
    label: 'Access Control',
    href: '/dashboard/admin/rbac',
    icon: ShieldCheck,
    requiredRole: 'ADMIN',
    children: [
      { label: 'Users', href: '/dashboard/admin/users', icon: Users, requiredRole: 'ADMIN' },
      { label: 'Roles', href: '/dashboard/admin/rbac/roles', icon: ShieldCheck, requiredRole: 'ADMIN' },
      { label: 'Menus', href: '/dashboard/admin/rbac/menus', icon: MenuIcon, requiredRole: 'ADMIN' },
      { label: 'Permissions', href: '/dashboard/admin/rbac/permissions', icon: Lock, requiredRole: 'ADMIN' },
    ],
  },
  {
    // CMS content group. Mirrors the CONTENT menu group seeded in prisma/seed.ts.
    // Container only — no page at /dashboard/admin/content.
    label: 'Content',
    href: '/dashboard/admin/content',
    icon: LayoutTemplate,
    requiredRole: 'ADMIN',
    children: [
      { label: 'Media', href: '/dashboard/content/media', icon: ImageIcon, requiredRole: 'ADMIN' },
      { label: 'Pages', href: '/dashboard/content/page', icon: FileText, requiredRole: 'ADMIN' },
    ],
  },
];

export const ORGANIZER_NAV: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: TrendingUp },
  { label: 'Orders', href: '/dashboard/orders', icon: CreditCard },
  { label: 'My Tickets', href: '/dashboard/my-tickets', icon: Ticket },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
  { label: 'Manage Events', href: '/dashboard/events', icon: Calendar },
  { label: 'Manage Venues', href: '/dashboard/venues', icon: MapPin },
];

export const ATTENDEE_NAV: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: TrendingUp },
  { label: 'Orders', href: '/dashboard/orders', icon: CreditCard },
  { label: 'My Tickets', href: '/dashboard/my-tickets', icon: Ticket },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
];

export function getNavForRole(role: string): NavItem[] {
  switch (role) {
    case 'ADMIN':
      return ADMIN_NAV;
    case 'ORGANIZER':
      return ORGANIZER_NAV;
    case 'ATTENDEE':
    default:
      return ATTENDEE_NAV;
  }
}
