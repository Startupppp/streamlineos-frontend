"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export interface CalendarOrgMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

export function useCalendarMemberLookup({
  search = "",
  limit,
  enabled = true,
}: {
  search?: string;
  limit?: number;
  enabled?: boolean;
} = {}) {
  const canView = useCan("directory:people:view");
  const term = search.trim();
  const isSearch = term.length > 0;
  return useQuery({
    queryKey: isSearch
      ? queryKeys.calendar.memberSearch(term)
      : queryKeys.calendar.orgMembers(),
    queryFn: ({ signal }) =>
      apiClient.get<CalendarOrgMember[]>(
        "/org/members",
        isSearch ? { search: term, limit: limit ?? 25 } : undefined,
        signal,
      ),
    staleTime: isSearch ? 30 * 1000 : 5 * 60 * 1000,
    enabled: canView && enabled,
    placeholderData: isSearch ? keepPreviousData : undefined,
  });
}

interface CalendarEvent {
  id: number;
  orgId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  startDate: string;
  endDate: string;
  allDay: boolean | null;
  color?: string | null;
  category: string;
  entityType?: string | null;
  entityId?: string | null;
  createdBy: string;
  attendeeIds?: string[] | null;
  isRecurring?: boolean | null;
  recurringRule?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  creator?: { name: string | null } | null;
}

interface OooConflict {
  userId: string;
  userName: string | null;
  leaveStart: string;
  leaveEnd: string;
}

interface MutateCalendarEventResponse {
  event: CalendarEvent;
  oooConflicts: OooConflict[];
  meetingUrl?: string | null;
  syncError?: string | null;
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
  location?: string | null;
  meetingUrl?: string | null;
  description?: string | null;
  creatorName?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  projectId?: number | null;
  linkedTicket?: {
    id: number;
    key: string;
    title: string;
    projectId: number;
    status: string;
  } | null;
  myRsvpStatus?: string | null;
  rrule?: string | null;
  isRecurring?: boolean | null;
}

export function extractEventNumericId(id: string): number | null {
  const match = id.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

interface CreateCalendarEventPayload {
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  allDay?: boolean;
  color?: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  attendeeIds?: string[];
  rrule?: string;
  recurrenceEnd?: string;
  syncConnectionId?: number;
  addConference?: boolean;
}

interface UpdateCalendarEventPayload {
  id: number;
  title?: string;
  description?: string | null;
  location?: string | null;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  allDay?: boolean;
  color?: string | null;
  category?: string;
  entityType?: string | null;
  entityId?: string | null;
  attendeeIds?: string[];
  rrule?: string | null;
  recurrenceEnd?: string | null;
}

interface UpsertOccurrenceExceptionPayload {
  eventId: number;
  occurrenceStart: string;
  modifiedTitle?: string;
  modifiedStart?: string;
  modifiedEnd?: string;
}

export interface CalendarEventsResponse {
  events: CalendarListItem[];
  failures: Array<{ key: string; label: string }>;
  truncated: boolean;
}

export function useCalendarEvents(start: Date, end: Date) {
  const canView = useCan("calendar:read");
  return useQuery({
    queryKey: queryKeys.calendar.events(start.toISOString(), end.toISOString()),
    queryFn: ({ signal }) =>
      apiClient.get<CalendarEventsResponse>("/calendar/events", {
        start: start.toISOString(),
        end: end.toISOString(),
      }, signal),
    staleTime: 2 * 60 * 1000,
    enabled: canView,
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "create"],
    mutationFn: (payload: CreateCalendarEventPayload) =>
      apiClient.post<MutateCalendarEventResponse>("/calendar/events", payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false }),
  });
}

export function useUpdateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "update"],
    mutationFn: ({ id, ...payload }: UpdateCalendarEventPayload) =>
      apiClient.put<CalendarEvent>(`/calendar/events/${id}`, payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false }),
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ deleted: boolean }>(`/calendar/events/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false }),
  });
}

export function useUpsertOccurrenceException() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "occurrence", "upsert"],
    mutationFn: ({ eventId, occurrenceStart, ...body }: UpsertOccurrenceExceptionPayload) =>
      apiClient.patch<{ id: number }>(
        `/calendar/events/${eventId}/occurrences/${encodeURIComponent(occurrenceStart)}`,
        body,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false }),
  });
}

export function useCancelOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "occurrence", "cancel"],
    mutationFn: ({ eventId, occurrenceStart }: { eventId: number; occurrenceStart: string }) =>
      apiClient.delete<{ id: number }>(
        `/calendar/events/${eventId}/occurrences/${encodeURIComponent(occurrenceStart)}`,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false }),
  });
}

type RsvpStatus = "accepted" | "declined" | "tentative";

interface EventAttendee {
  id: number;
  eventId: number;
  userId: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

export function useEventAttendees(eventId: number | null) {
  const can = useCan("calendar:read");
  return useQuery({
    queryKey: queryKeys.calendar.attendees(eventId ?? 0),
    queryFn: ({ signal }) => apiClient.get<EventAttendee[]>(`/calendar/events/${eventId}/rsvp`, undefined, signal),
    enabled: can && eventId !== null,
    staleTime: 60 * 1000,
  });
}

export function useRsvpCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "rsvp"],
    mutationFn: ({ eventId, status }: { eventId: number; status: RsvpStatus }) =>
      apiClient.post<EventAttendee>(`/calendar/events/${eventId}/rsvp`, { status }),
    onSuccess: (_, { eventId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.calendar.attendees(eventId) });
      void qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
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

export function useExternalCalendarEvents(start: Date, end: Date, enabled: boolean) {
  const canView = useCan("calendar:read");
  return useQuery({
    queryKey: queryKeys.calendar.externalEvents(start.toISOString(), end.toISOString()),
    queryFn: ({ signal }) =>
      apiClient.get<ExternalCalendarEventsResponse>("/calendar/external-events", {
        start: start.toISOString(),
        end: end.toISOString(),
      }, signal),
    enabled: canView && enabled,
    staleTime: 60_000,
  });
}

export interface CalendarSource {
  key: string;
  label: string;
  module: string;
  enabled: boolean;
}

export function useCalendarSources() {
  const canView = useCan("calendar:read");
  return useQuery({
    queryKey: queryKeys.calendar.sources(),
    queryFn: ({ signal }) => apiClient.get<CalendarSource[]>("/calendar/sources", undefined, signal),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useSetCalendarSourcePreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "sources", "set-preference"],
    mutationFn: ({ sourceKey, enabled }: { sourceKey: string; enabled: boolean }) =>
      apiClient.put<{ sourceKey: string; enabled: boolean }>(
        `/calendar/sources/${sourceKey}`,
        { enabled },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false });
    },
  });
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

const calendarSyncStatusKey = (eventId: number) =>
  [...queryKeys.calendar.all, "sync-status", eventId] as const;

export function useEventSyncStatus(eventId: number | null) {
  return useQuery({
    queryKey: calendarSyncStatusKey(eventId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<EventSyncStatusResponse>(
        `/calendar/events/${eventId}/sync-status`,
        undefined,
        signal,
      ),
    enabled: eventId !== null,
    staleTime: 15_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "in_flight" ? 5_000 : false;
    },
  });
}

export function useRetryEventSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "sync-retry"],
    mutationFn: ({ eventId }: { eventId: number }) =>
      apiClient.post<{ requeued: number }>(
        `/calendar/events/${eventId}/sync-retry`,
        {},
      ),
    onSuccess: (_, { eventId }) => {
      void qc.invalidateQueries({ queryKey: calendarSyncStatusKey(eventId) });
    },
  });
}
