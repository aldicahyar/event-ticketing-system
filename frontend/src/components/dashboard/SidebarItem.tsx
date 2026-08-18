'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import type { NavItem } from '@/config/navigation';

interface SidebarItemProps {
  item: NavItem;
  onNavigate?: () => void;
  mobile?: boolean;
  /** Pending-work counter shown as a badge (omitted when 0/undefined). */
  badge?: number;
}

/**
 * Renders a single sidebar item. Automatically switches between:
 *   - Flat link (when no `children`)
 *   - Collapsible group (when `children` provided)
 *
 * Animation:
 *   - Collapsible uses CSS grid-template-rows 0fr → 1fr for auto-height smoothness
 *   - Chevron rotates with transform-only transition (compositor-friendly)
 *   - Active state animates only colors (no layout shift)
 *   - Honors prefers-reduced-motion via motion-reduce: variant
 */
export function SidebarItem({ item, onNavigate, mobile = false, badge }: SidebarItemProps) {
  const pathname = usePathname();
  // useId() guarantees unique IDs even when the same item renders twice
  // (mobile horizontal nav + desktop sticky sidebar).
  const reactId = useId();
  const groupId = `group-${reactId.replace(/[:]/g, '')}`;
  const hasChildren = !!item.children?.length;
  const activeChild = item.children?.find((child) => pathname === child.href);
  const isExactActive = pathname === item.href;
  const isPrefixActive = hasChildren && pathname.startsWith(item.href + '/');
  const isGroupActive = isExactActive || isPrefixActive;
  const mobileHref = activeChild?.href ?? item.children?.[0]?.href ?? item.href;

  const [isOpen, setIsOpen] = useState(isPrefixActive);

  // Auto-open when path is under the parent's href
  useEffect(() => {
    if (isPrefixActive) setIsOpen(true);
  }, [isPrefixActive]);

  if (!hasChildren || mobile) {
    return (
      <Link
        href={hasChildren ? mobileHref : item.href}
        onClick={onNavigate}
        aria-current={isGroupActive ? 'page' : undefined}
        className={`flex items-center gap-3 px-4 py-3 transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
          mobile ? 'shrink-0 whitespace-nowrap ' : ''
        }${
          isGroupActive
            ? 'bg-white text-black'
            : 'text-[#CCCCCC] hover:bg-white/10 hover:text-white'
        }`}
      >
        <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span className="font-bold uppercase text-sm">{item.label}</span>
        {badge ? (
          <span
            className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
            aria-label={`${badge} awaiting action`}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </Link>
    );
  }

  const groupLabel = item.label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={groupId}
        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
          isGroupActive
            ? 'text-white'
            : 'text-[#CCCCCC] hover:bg-white/10 hover:text-white'
        }`}
      >
        <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span className="font-bold uppercase text-sm flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ease-out motion-reduce:transition-none ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/*
        Auto-height animation via CSS grid trick:
        grid-template-rows transitions from 0fr → 1fr smoothly.
        Inline style used because Tailwind JIT's arbitrary value syntax for
        dynamic grid-template-rows is unreliable across versions.
        Overflow hidden on the inner wrapper clips children during collapse.
        Respects prefers-reduced-motion.
      */}
      <div
        className="overflow-hidden transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
        }}
      >
        {/* The grid item needs min-height:0 (+overflow-hidden). Without it the
            default min-height:auto keeps the row at its content height, so the
            0fr track never collapses and the menu stays visible when closed. */}
        <div className="overflow-hidden min-h-0">
          <div
            id={groupId}
            role="group"
            aria-label={`${item.label} sub-menu`}
            data-group-label={groupLabel}
            className="mt-1 ml-4 space-y-1 border-l border-mono-dark-grey pl-2"
          >
            {item.children!.map((child) => {
              const childActive = pathname === child.href;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={childActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2 transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
                    childActive
                      ? 'bg-white text-black'
                      : 'text-[#CCCCCC] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <child.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="font-bold uppercase text-xs">{child.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
