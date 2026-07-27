'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import type { SidebarItem } from '@/types/rbac';
import { getIcon } from '@/lib/icon-registry';

interface DynamicSidebarItemProps {
  item: SidebarItem;
  onNavigate?: () => void;
}

/**
 * Sidebar item for backend-driven menus.
 * Resolves icon string via ICON_REGISTRY (unlike SidebarItem which uses NavItem).
 *
 * Behaviour:
 *   - Flat link (no children) when parent_code indicates leaf
 *   - Collapsible group when item has children (detected by caller)
 *   - Auto-expand when current path is under the parent's slug
 *   - External links (is_new_tab) open in new tab
 */
export function DynamicSidebarItem({ item, onNavigate }: DynamicSidebarItemProps) {
  const pathname = usePathname();
  const reactId = useId();
  const groupId = `group-${reactId.replace(/[:]/g, '')}`;
  const hasChildren = !!item.children?.length;
  const href = item.slug ?? '#';
  // Guard window for SSR: this may render on the server if a menu ever has an
  // absolute http(s) slug.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const isExternal =
    item.is_new_tab || (href.startsWith('http') && !!origin && !href.startsWith(origin));

  const isExactActive = pathname === href;
  // A container menu (e.g. the RBAC group) has slug=null → href '#', so its own
  // href can never prefix-match. Fall back to the children's slugs so the group
  // still auto-expands and highlights when a child route is active.
  const childActive =
    hasChildren &&
    (item.children ?? []).some(
      (c) => c.slug && (pathname === c.slug || pathname.startsWith(c.slug + '/')),
    );
  const isPrefixActive =
    (hasChildren && href !== '#' && pathname.startsWith(href + '/')) || childActive;
  const isGroupActive = isExactActive || isPrefixActive;

  const [isOpen, setIsOpen] = useState(isPrefixActive);
  useEffect(() => {
    if (isPrefixActive) setIsOpen(true);
  }, [isPrefixActive]);

  const Icon = getIcon(item.icon);

  if (!hasChildren) {
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className={`flex items-center gap-3 px-4 py-3 transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
            isExactActive ? 'bg-white text-black' : 'text-[#CCCCCC] hover:bg-white/10 hover:text-white'
          }`}
        >
          <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="font-bold uppercase text-sm">{item.name}</span>
        </a>
      );
    }
    return (
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={isExactActive ? 'page' : undefined}
        className={`flex items-center gap-3 px-4 py-3 transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
          isExactActive ? 'bg-white text-black' : 'text-[#CCCCCC] hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span className="font-bold uppercase text-sm">{item.name}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={groupId}
        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
          isGroupActive ? 'text-white' : 'text-[#CCCCCC] hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span className="font-bold uppercase text-sm flex-1 text-left">{item.name}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ease-out motion-reduce:transition-none ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        className="overflow-hidden transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
        style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        {/* The grid item needs min-height:0 (+overflow-hidden). Without it the
            default min-height:auto keeps the row at its content height, so the
            0fr track never collapses and the menu stays visible when closed. */}
        <div className="overflow-hidden min-h-0">
          <div
            id={groupId}
            role="group"
            aria-label={`${item.name} sub-menu`}
            className="mt-1 ml-4 space-y-1 border-l border-mono-dark-grey pl-2"
          >
            {item.children!.map((child) => (
              <DynamicSidebarItem key={child.code} item={child} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Attach children to parents based on parent_code.
 * Input: flat array from /menus/my-sidebar.
 * Output: nested array with `children` filled in.
 */
export function nestSidebarItems(flat: SidebarItem[]): SidebarItem[] {
  const sorted = [...flat].sort((a, b) => a.order - b.order);
  const byCode = new Map<string, SidebarItem>();
  for (const item of sorted) byCode.set(item.code, { ...item, children: [] });

  const roots: SidebarItem[] = [];
  for (const item of byCode.values()) {
    if (item.parent_code && byCode.has(item.parent_code)) {
      byCode.get(item.parent_code)!.children!.push(item);
    } else {
      roots.push(item);
    }
  }
  return roots;
}
