'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, LogOut, Bell } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { getNavForRole } from '@/config/navigation';
import { SidebarItem } from '@/components/dashboard/SidebarItem';
import { DynamicSidebarItem, nestSidebarItems } from '@/components/dashboard/DynamicSidebarItem';
import { Skeleton } from '@/components/ui/skeleton';
import type { SidebarItem as SidebarItemType } from '@/types/rbac';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [currentUser, setCurrentUser] = useState({
    firstName: 'User',
    lastName: '',
    role: 'ATTENDEE',
  });

  // Dynamic sidebar state
  const [sidebarItems, setSidebarItems] = useState<SidebarItemType[] | null>(null);
  const [sidebarLoading, setSidebarLoading] = useState(true);

  const loadSidebar = useCallback(async () => {
    setSidebarLoading(true);
    try {
      const data = await apiClient.getMySidebar();
      setSidebarItems(data ?? []);
    } catch {
      // Graceful fallback: caller will use hardcoded nav when sidebarItems is null
      setSidebarItems(null);
    } finally {
      setSidebarLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      loadSidebar();
    }
  }, [isLoading, isAuthenticated, loadSidebar]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
      } else {
        const storedUser = apiClient.getUser();
        if (storedUser) {
          const nameParts = storedUser.name.split(' ');
          setCurrentUser({
            firstName: nameParts[0] || 'User',
            lastName: nameParts.slice(1).join(' ') || '',
            role: storedUser.role,
          });
        }
      }
    }
  }, [isLoading, isAuthenticated, router]);

  // Collect all allowed slugs from the sidebar (flat list from backend).
  const allowedSlugs = useMemo(() => {
    if (!sidebarItems) return null;
    return sidebarItems.map((item) => item.slug).filter((s): s is string => !!s);
  }, [sidebarItems]);

  // Route guard: RBAC-aware — use sidebar slugs to determine allowed routes.
  useEffect(() => {
    if (isLoading || !isAuthenticated || !allowedSlugs) return;

    // Build the set of allowed route prefixes from sidebar slugs
    const allowedPaths = new Set(allowedSlugs);
    // Always allow these universal routes
    allowedPaths.add('/dashboard');
    allowedPaths.add('/dashboard/profile');

    const isAllowed = allowedPaths.has(pathname) || [...allowedPaths].some((p) => pathname.startsWith(p + '/'));

    if (!isAllowed && pathname.startsWith('/dashboard')) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, allowedSlugs, pathname, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Build sidebar data: prefer backend, fallback to hardcoded nav
  const fallbackNav = getNavForRole(currentUser.role);
  const dynamicTree = sidebarItems ? nestSidebarItems(sidebarItems) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-xl uppercase animate-pulse">Loading...</div>
      </div>
    );
  }

  // Sidebar render helper — works for both dynamic and fallback modes
  const renderSidebarContent = (mobile: boolean) => {
    if (sidebarLoading) {
      // Loading skeleton
      return (
        <div className="space-y-1" aria-busy="true" aria-live="polite">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <Skeleton variant="circle" className="w-5 h-5" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      );
    }

    if (dynamicTree) {
      // Dynamic mode (backend-driven)
      return (
        <div className={mobile ? 'flex gap-2' : 'space-y-1'}>
          {dynamicTree.map((item) => (
            <DynamicSidebarItem key={item.code} item={item} />
          ))}
        </div>
      );
    }

    // Fallback mode (hardcoded navigation.ts)
    return (
      <div className={mobile ? 'flex gap-2' : 'space-y-1'}>
        {fallbackNav.map((item) => (
          <SidebarItem key={`${item.href}-${item.label}`} item={item} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">

      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-mono-dark-grey"
        role="navigation"
        aria-label="Dashboard navigation"
      >
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="EventTicket home">
            <div className="w-4 h-4 bg-white" aria-hidden="true" />
            <span className="text-xl font-display font-bold uppercase">EventTicket.</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              className="relative p-2 hover:bg-white/10 transition-colors min-h-touch min-w-touch flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center" aria-hidden="true">
                <User className="w-4 h-4 text-black" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold uppercase leading-none">
                  {currentUser.firstName} {currentUser.lastName}
                </span>
                <span className="text-[9px] text-[#888] font-bold uppercase tracking-wider mt-1">
                  Role: {currentUser.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Mobile: horizontal tabs */}
            <div className="flex lg:hidden overflow-x-auto gap-2 mb-6 -mx-4 px-4 scrollbar-none">
              {renderSidebarContent(true)}
              <button
                onClick={handleLogout}
                className="whitespace-nowrap min-h-touch px-4 py-3 text-red-500 hover:bg-red-600/10 transition-all flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 border border-mono-dark-grey lg:border-0"
              >
                <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="font-bold uppercase text-sm">Sign Out</span>
              </button>
            </div>

            {/* Desktop: sticky sidebar */}
            <div className="hidden lg:block">
              <div className="bg-black border border-mono-dark-grey p-4 sticky top-24">
                <nav aria-label="Dashboard sidebar">
                  {renderSidebarContent(false)}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-600/10 transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                    aria-label="Sign out of your account"
                  >
                    <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span className="font-bold uppercase text-sm">Sign Out</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Konten Utama */}
          <div className="lg:col-span-3">
            {children}
          </div>

        </div>
      </div>
    </div>
  );
}
