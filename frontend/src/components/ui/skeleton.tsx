import { cn } from '@/lib/utils';
import React from 'react';

/**
 * Pulse animation skeleton for loading states.
 * Mirrors the final layout shape to prevent CLS (layout shift) when data arrives.
 *
 * Usage:
 *   <Skeleton className="h-4 w-24" />              // text placeholder
 *   <Skeleton variant="card" />                    // full card
 *   <Skeleton variant="circle" className="w-12" /> // avatar/icon
 */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'card' | 'circle' | 'rect';
}

export function Skeleton({ variant = 'rect', className, ...props }: SkeletonProps) {
  const base =
    'bg-white/5 border border-mono-dark-grey/50 animate-pulse motion-reduce:animate-none';

  const variants: Record<NonNullable<SkeletonProps['variant']>, string> = {
    text: 'h-4',
    card: 'h-full min-h-[80px] w-full',
    circle: 'rounded-full aspect-square',
    rect: '',
  };

  return (
    <div
      aria-hidden="true"
      className={cn(base, variants[variant], className)}
      {...props}
    />
  );
}

/**
 * Order row skeleton - mirrors the orders list item layout.
 */
export function OrderRowSkeleton() {
  return (
    <div className="bg-black border border-mono-dark-grey">
      {/* Header */}
      <div className="p-4 border-b border-mono-dark-grey flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton variant="circle" className="w-12 h-12" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-20" />
          </div>
        </div>
        <Skeleton className="h-5 w-20" />
      </div>
      {/* Body */}
      <div className="p-4 flex items-start gap-4">
        <Skeleton className="w-20 h-20" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="p-3 bg-white/5 border-t border-mono-dark-grey flex justify-between">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/**
 * Stat card skeleton - for dashboard overview cards.
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-black border border-mono-dark-grey p-3 md:p-4">
      <Skeleton variant="circle" className="w-6 h-6 mb-3" />
      <Skeleton className="h-6 w-16 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/**
 * Ticket card skeleton - for my-tickets page.
 */
export function TicketCardSkeleton() {
  return (
    <div className="bg-black border border-mono-dark-grey">
      <Skeleton className="w-full h-48" />
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton variant="card" className="aspect-[3/4]" />
          <Skeleton variant="card" className="aspect-[3/4]" />
        </div>
      </div>
    </div>
  );
}

/**
 * Profile field skeleton - for profile page form inputs.
 */
export function ProfileFieldSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
