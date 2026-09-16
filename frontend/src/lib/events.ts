export interface RawEvent {
  status?: string | null;
  event_date?: string | null;
  start_date_time?: string | null;
  [key: string]: any;
}

/**
 * Filters events that are publicly visible and haven't ended yet.
 * Only includes events with status PUBLISHED or ONGOING whose event date is >= now.
 */
export function filterUpcomingEvents<T extends RawEvent>(events: T[], referenceDate: Date = new Date()): T[] {
  return events.filter((e) => {
    const isStatusActive = e.status === 'PUBLISHED' || e.status === 'ONGOING';
    const dateStr = e.event_date || e.start_date_time;
    if (!isStatusActive || !dateStr) return false;
    return new Date(dateStr).getTime() >= referenceDate.getTime();
  });
}

/**
 * Cheapest ticket price for an event: the lowest tier price when tiers exist,
 * otherwise the base price. Returns 0 when neither is parseable.
 */
export function getMinPrice(e: RawEvent): number {
  const tiers = e.ticket_tiers as { price: string | number }[] | undefined;
  if (tiers && tiers.length > 0) {
    return Math.min(...tiers.map((t) => Number(t.price)));
  }
  return Number(e.base_price) || 0;
}
