
export interface CalendarOrgMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

export interface CalendarOooConflict {
  userId: string;
  userName: string | null;
  leaveStart: string;
  leaveEnd: string;
}

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
  source: string;
  timezone?: string | null;
  location?: string | null;
  description?: string | null;
  creatorName?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  projectId?: number | null;
  myRsvpStatus?: string | null;
  sourceKey: string;
  sourceRecordId: string;
  occurrenceId: string;
  status: string | null;
  timeKind: "timed" | "date";
  time:
    | { kind: "timed"; start: string; end: string; timezone: string | null }
    | { kind: "date"; startDate: string; endDate: string };
  availability: "busy" | "free" | "out-of-office" | "working-elsewhere";
  sourceVersion: string | null;
  actions: {
    view: boolean;
    edit: boolean;
    delete: boolean;
    rsvp: boolean;
    complete: boolean;
  };
  freshness: { state: "fresh" | "stale" | "unknown"; asOf: string | null };
  connectionId?: number;
  syncedProviderEventId?: string | null;
  accountEmail?: string | null;
  meetingUrl?: string | null;
  webLink?: string | null;
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
  canManage: boolean;
  localVersion: number;
  guestEmails: string[];
  reminderOffsetsMinutes: number[] | null;
}

export interface ParsedCalendarEventId {
  eventId: number;
  occurrenceStart: string | null;
}

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
  coverageState: "complete" | "partial" | "failed" | "continued";
  coverage: Array<{
    sourceKey: string;
    state: "complete" | "partial" | "failed" | "continued";
    nextCursor: string | null;
  }>;
}

export interface CalendarHistoryResponse extends CalendarEventsResponse {
  windowStart: string;
  windowEnd: string;
  nextCursor: string | null;
}

export interface CalendarSearchResponse extends CalendarEventsResponse {
  nextCursor: string | null;
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
  timezone?: string | null;
  location: string | null;
  meetingUrl: string | null;
  webLink: string | null;
  sourceKey: string;
  sourceRecordId: string;
  occurrenceId: string;
  status: string | null;
  timeKind: "timed" | "date";
  availability: "busy" | "free";
  sourceVersion: string | null;
  actions: { view: boolean; edit: boolean; delete: boolean; rsvp: boolean; complete: boolean };
  freshness: { state: "fresh" | "stale" | "unknown"; asOf: string | null };
}

export interface ExternalCalendarEventsResponse {
  events: ExternalCalendarEvent[];
  errors: Array<{ connectionId: number; accountEmail: string | null; message: string }>;
  complete: boolean;
  accounts: Array<{
    connectionId: number;
    accountEmail: string | null;
    toolkit: "googlecalendar" | "outlook";
    state: "complete" | "partial" | "failed" | "reauth_required";
    hasMore: boolean;
  }>;
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
  operation: "create" | "update" | "delete" | "restore" | null;
  queuedAt: string | null;
  processedAt: string | null;
  retryable: boolean;
  failureKind:
    | "auth"
    | "capability"
    | "conference"
    | "conflict"
    | "transient"
    | null;
  repairAction:
    | "none"
    | "retry"
    | "reconnect"
    | "change_event"
    | "review_conflict";
}
