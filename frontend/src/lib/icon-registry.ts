import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, BarChart3, Activity, ClipboardList,
  Calendar, MapPin, Layers, Percent, ShieldCheck, Menu as MenuIcon, Lock,
  CreditCard, Ticket, User, TrendingUp,
  // User management
  Users, UserCog, UserPlus, KeyRound, Unlock,
  // Content (CMS)
  Image as ImageIcon, FileText, LayoutTemplate,
  // Fallback & admin icons
  ChevronRight, CircleDot, FolderTree, Settings, HelpCircle, Scale,
} from 'lucide-react';

/**
 * String → Lucide React component registry.
 *
 * Used by:
 *   - Dynamic sidebar (backend-driven menu)
 *   - Admin menu CRUD form (icon picker dropdown)
 *
 * When adding a new icon here, also update the backend seed/CRUD validation
 * if it whitelists icon names (currently not enforced).
 *
 * Keep names in PascalCase to match lucide-react exports.
 */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  // Dashboard group
  LayoutDashboard,
  BarChart3,
  Activity,
  ClipboardList,
  TrendingUp,

  // Admin management
  Calendar,
  MapPin,
  Layers,
  Percent,
  ShieldCheck,
  Menu: MenuIcon,
  Lock,
  FolderTree,
  Settings,
  Scale,

  // User management
  Users,
  UserCog,
  UserPlus,
  KeyRound,
  Unlock,

  // Content (CMS)
  Image: ImageIcon,
  FileText,
  LayoutTemplate,

  // Attendee/Organizer
  CreditCard,
  Ticket,
  User,

  // Misc
  ChevronRight,
  CircleDot,
};

export const FALLBACK_ICON: LucideIcon = HelpCircle;

/**
 * Resolve an icon name string to a Lucide component.
 * Returns a fallback icon if name is missing or not registered.
 */
export function getIcon(name?: string | null): LucideIcon {
  if (!name) return FALLBACK_ICON;
  return ICON_REGISTRY[name] ?? FALLBACK_ICON;
}

/**
 * Returns the list of available icon names for the admin icon picker.
 */
export function listIconNames(): string[] {
  return Object.keys(ICON_REGISTRY).sort();
}
