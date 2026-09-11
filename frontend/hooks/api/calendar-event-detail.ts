"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const calendarEventDetailContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarEventDetailContract),
);
const calendarSyncStatusContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarSyncStatusContract),
);
const calendarSyncRetryContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarSyncRetryContract),
);
const calendarEventAttendeesContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarEventAttendeesContract),
);
const calendarRsvpContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarRsvpContract),
);
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { useCan } from "@/hooks/api/access";
import type { z } from "zod";
import type {
  calendarEventAttendeesContract as calendarEventAttendeesContractDef,
  calendarRsvpContract as calendarRsvpContractDef,
} from "@/hooks/api/calendar-schema";
import type { CalendarEventDetail, EventSyncStatusResponse } from "./calendar-types";

type RsvpStatus = "accepted" | "declined" | "tentative";

type EventAttendee = z.infer<typeof calendarEventAttendeesContractDef>[number];
type RsvpResult = z.infer<typeof calendarRsvpContractDef>;

const calendarSyncStatusKey = (eventId: number) =>
  [...platformHierarchyQueryKeys.calendar.all, "sync-status", eventId] as const;

export function useCalendarEvent(eventId: number | null) {
  const can = useCan("calendar:read");
  return useQuery({
    queryKey: platformHierarchyQueryKeys.calendar.eventDetail(eventId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<CalendarEventDetail>(`/calendar/events/${eventId}`, undefined, signal, calendarEventDetailContract),
    enabled: can && eventId !== null,
    staleTime: 60 * 1000,
  });
}

export function useEventAttendees(eventId: number | null) {
  const can = useCan("calendar:read");
  return useQuery({
    queryKey: platformHierarchyQueryKeys.calendar.attendees(eventId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<EventAttendee[]>(
        `/calendar/events/${eventId}/rsvp`,
        undefined,
        signal,
        calendarEventAttendeesContract,
      ),
    enabled: can && eventId !== null,
    staleTime: 60 * 1000,
  });
}

export function useRsvpCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "rsvp"],
    mutationFn: ({ eventId, status }: { eventId: number; status: RsvpStatus }) =>
      apiClient.post<RsvpResult>(
        `/calendar/events/${eventId}/rsvp`,
        { status },
        undefined,
        calendarRsvpContract,
      ),
    onSuccess: (_, { eventId }) => {
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.attendees(eventId) });
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.all });
    },
  });
}

export function useEventSyncStatus(eventId: number | null) {
  return useQuery({
    queryKey: calendarSyncStatusKey(eventId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<EventSyncStatusResponse>(
        `/calendar/events/${eventId}/sync-status`,
        undefined,
        signal,
        calendarSyncStatusContract,
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
      apiClient.post<{ requeued: number }>(`/calendar/events/${eventId}/sync-retry`, {}, undefined, calendarSyncRetryContract),
    onSuccess: (_, { eventId }) => {
      void qc.invalidateQueries({ queryKey: calendarSyncStatusKey(eventId) });
    },
  });
}
