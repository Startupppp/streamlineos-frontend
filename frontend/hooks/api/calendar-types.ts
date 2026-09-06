/**
 * Shared types and utilities for the calendar domain.
 *
 * No React or API-client imports here — this module is the neutral substrate
 * that calendar.ts, calendar-mutations.ts and calendar-event-detail.ts all
 * import from, keeping the split files free of cross-runtime dependencies.
 */

export interface CalendarOrgMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

/** An attendee on approved leave over the new event's window. */
export interface CalendarOooConflict {
  userId: string;
  userName: string | null;
  leaveStart: string;
  leaveEnd: string;
}

/**
 * An existing occurrence the new event overlaps, projected from
 * `CalendarOccurrence` — `startDate`/`endDate` are Dates on the server and
 * arrive here as ISO strings.
 */
export interface CalendarEventConflict {
  eventId: number;
  title: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  timezone?: string;
}

export interface CalendarListItem {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  color?: string | null;
  category: string;
  source:
    | "event"
    | "leave"
    | "interview"
    | "task"
    | "holiday"
    | "attendance";
  timezone?: string | null;
  location?: string | null;
  description?: string | null;
  creatorName?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  projectId?: number | null;
  myRsvpStatus?: string | null;
}

export interface CalendarEventDetail {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  timezone: string;
  color: string | null;
  category: string;
  entityType: string | null;
  entityId: string | null;
  location: string | null;
  meetingUrl: string | null;
  description: string | null;
  creatorName: string | null;
  myRsvpStatus: string | null;
  linkedTicket: {
    id: number;
    key: string;
    title: string;
    projectId: number;
    status: string;
  } | null;
  rrule: string | null;
  isRecurring: boolean;
}

export interface ParsedCalendarEventId {
  /** The `calendar_events` row id. */
  eventId: number;
  /**
   * The occurrence's NOMINAL start, present only for a recurring occurrence.
   * `calendar_event_exceptions` is keyed on this instant, and for a rescheduled
   * occurrence it is not `item.start` — the projection carries the nominal
   * instant in the id and the moved time in `start`.
   */
  occurrenceStart: string | null;
}

/**
 * Parse by structure, not by trailing digits.
 *
 * The native source emits `event-<id>` and, for a recurring occurrence,
 * `event-<id>-<ISO instant>`. Matching `/(\d+)$/` returned null for every
 * occurrence (an ISO instant ends in `Z`) and read a stray number off ids
 * belonging to other sources entirely (`attendance-absence-2026-01-05` -> 5).
 */
export function parseCalendarEventId(id: string): ParsedCalendarEventId | null {
  const match = /^event-(\d+)(?:-(.+))?$/.exec(id);
  if (!match?.[1]) return null;
  const eventId = Number.parseInt(match[1], 10);
  if (!Number.isSafeInteger(eventId)) return null;
  return { eventId, occurrenceStart: match[2] ?? null };
}

export function extractEventNumericId(id: string): number | null {
  return parseCalendarEventId(id)?.eventId ?? null;
}

export interface CalendarEventsResponse {
  events: CalendarListItem[];
  failures: Array<{ key: string; label: string }>;
  truncated: boolean;
}

export interface ExternalCalendarEvent {
  id: string;
  connectionId: number;
  toolkit: "googlecalendar" | "outlook";
  accountEmail: string | null;
  providerEventId: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  meetingUrl: string | null;
  webLink: string | null;
}

export interface ExternalCalendarEventsResponse {
  events: ExternalCalendarEvent[];
  errors: Array<{ connectionId: number; accountEmail: string | null; message: string }>;
}

export interface CalendarSource {
  key: string;
  label: string;
  module: string;
  enabled: boolean;
}

export interface EventSyncStatusResponse {
  status: "synced" | "pending" | "in_flight" | "failed" | "not_synced";
  attemptCount: number;
  lastError: string | null;
  operation: "create" | "update" | "delete" | null;
  queuedAt: string | null;
  processedAt: string | null;
  retryable: boolean;
}
