"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";

const calendarCreateEventContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarCreateEventContract),
);
const calendarUpdateEventContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarUpdateEventContract),
);
const calendarDeleteEventContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarDeleteEventContract),
);
const calendarOccurrenceExceptionContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarOccurrenceExceptionContract),
);
import { invalidateCalendarProjectionWindows } from "@/lib/calendar-projection-cache";
import type { CalendarOooConflict, CalendarEventConflict, CalendarEventsResponse } from "./calendar-types";

/**
 * The row `POST /calendar/events` and `PUT /calendar/events/:id` return, mirroring
 * `calendarEventWireColumns` in `calendar.service.ts` field for field.
 */
interface CalendarEvent {
  id: number;
  orgId: string;
  title: string;
  description: string | null;
  location: string | null;
  meetingUrl: string | null;
  startDate: string;
  endDate: string;
  timezone: string;
  allDay: boolean;
  color: string | null;
  category: string;
  entityType: string | null;
  entityId: string | null;
  rrule: string | null;
  recurrenceEnd: string | null;
  localVersion: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mirrors `CalendarService.createEvent`'s return exactly (calendar.service.ts).
 *
 * `syncQueued` is what the server actually reports: the intent is committed,
 * the push has not happened yet. Its outcome is read from
 * `GET /calendar/events/:id/sync-status`.
 */
interface MutateCalendarEventResponse {
  event: CalendarEvent;
  oooConflicts: CalendarOooConflict[];
  eventConflicts: CalendarEventConflict[];
  meetingUrl?: string | null;
  syncQueued?: boolean;
}

export interface CreateCalendarEventPayload {
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
  calendarEventId: number;
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
  expectedVersion?: number;
}

interface UpsertOccurrenceExceptionPayload {
  eventId: number;
  occurrenceStart: string;
  modifiedTitle?: string;
  modifiedDescription?: string;
  modifiedStart?: string;
  modifiedEnd?: string;
  expectedVersion?: number;
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "create"],
    mutationFn: (payload: CreateCalendarEventPayload) =>
      apiClient.post<MutateCalendarEventResponse>("/calendar/events", payload, undefined, calendarCreateEventContract),
    onSuccess: () => {
      invalidateCalendarProjectionWindows(qc);
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.all });
    },
  });
}

export function useUpdateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "update"],
    mutationFn: ({ calendarEventId, ...payload }: UpdateCalendarEventPayload) =>
      apiClient.put<CalendarEvent>(`/calendar/events/${calendarEventId}`, payload, undefined, calendarUpdateEventContract),
    onSuccess: () => {
      invalidateCalendarProjectionWindows(qc);
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.all });
    },
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "delete"],
    mutationFn: (calendarEventId: number) => apiClient.delete<{ deleted: boolean }>(`/calendar/events/${calendarEventId}`, undefined, undefined, calendarDeleteEventContract),
    onSuccess: () => {
      invalidateCalendarProjectionWindows(qc);
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.all });
    },
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
        undefined,
        calendarOccurrenceExceptionContract,
      ),
    onSuccess: () => {
      invalidateCalendarProjectionWindows(qc);
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.all });
    },
  });
}

export function useCancelOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "occurrence", "cancel"],
    mutationFn: ({ eventId, occurrenceStart, expectedVersion }: { eventId: number; occurrenceStart: string; expectedVersion?: number }) =>
      apiClient.delete<{ id: number }>(
        `/calendar/events/${eventId}/occurrences/${encodeURIComponent(occurrenceStart)}${expectedVersion === undefined ? "" : `?expectedVersion=${expectedVersion}`}`,
        undefined,
        undefined,
        calendarOccurrenceExceptionContract,
      ),
    onSuccess: (_result, { eventId, occurrenceStart }) => {
      const occurrenceId = `event-${eventId}-${occurrenceStart}`;
      qc.setQueriesData<CalendarEventsResponse>(
        { queryKey: platformHierarchyQueryKeys.calendar.eventsAll },
        (window) => window && Array.isArray(window.events) ? {
          ...window,
          events: window.events.filter((event) => event.id !== occurrenceId),
        } : window,
      );
      invalidateCalendarProjectionWindows(qc);
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.all });
    },
  });
}
