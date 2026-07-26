import {
  LayoutDashboard, BarChart3, Activity, ClipboardList,
  Calendar, MapPin, Layers, Percent,
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
