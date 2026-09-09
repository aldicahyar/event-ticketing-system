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
