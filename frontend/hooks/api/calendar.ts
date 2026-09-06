"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { useCan } from "@/hooks/api/access";
import type {
  CalendarOrgMember,
  CalendarSource,
  CalendarEventsResponse,
  ExternalCalendarEventsResponse,
} from "./calendar-types";

// ---- Re-exports — all public imports from this module remain intact ----
export type {
  CalendarOrgMember,
  CalendarOooConflict,
  CalendarEventConflict,
  CalendarListItem,
  CalendarEventDetail,
  ParsedCalendarEventId,
  CalendarEventsResponse,
  ExternalCalendarEvent,
  ExternalCalendarEventsResponse,
  CalendarSource,
  EventSyncStatusResponse,
} from "./calendar-types";
export {
  parseCalendarEventId,
  extractEventNumericId,
} from "./calendar-types";
export {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
  useUpsertOccurrenceException,
  useCancelOccurrence,
} from "./calendar-mutations";
export {
  useCalendarEvent,
  useEventAttendees,
  useRsvpCalendarEvent,
  useEventSyncStatus,
  useRetryEventSync,
} from "./calendar-event-detail";

// ---- Member lookup hook ----

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
      ? platformHierarchyQueryKeys.calendar.memberSearch(term)
      : platformHierarchyQueryKeys.calendar.orgMembers(),
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

// ---- Range-list hooks ----

export function useCalendarEvents(start: Date, end: Date) {
  const canView = useCan("calendar:read");
  return useQuery({
    queryKey: platformHierarchyQueryKeys.calendar.events(
      start.toISOString(),
      end.toISOString(),
    ),
    queryFn: ({ signal }) =>
      apiClient.get<CalendarEventsResponse>("/calendar/events", {
        start: start.toISOString(),
        end: end.toISOString(),
      }, signal),
    staleTime: 2 * 60 * 1000,
    enabled: canView,
  });
}

export function useCalendarSources() {
  const canView = useCan("calendar:read");
  return useQuery({
    queryKey: platformHierarchyQueryKeys.calendar.sources(),
    queryFn: ({ signal }) =>
      apiClient.get<CalendarSource[]>("/calendar/sources", undefined, signal),
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
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.all, exact: false });
    },
  });
}

export function useExternalCalendarEvents(start: Date, end: Date, enabled: boolean) {
  const canView = useCan("calendar:read");
  return useQuery({
    queryKey: platformHierarchyQueryKeys.calendar.externalEvents(
      start.toISOString(),
      end.toISOString(),
    ),
    queryFn: ({ signal }) =>
      apiClient.get<ExternalCalendarEventsResponse>("/calendar/external-events", {
        start: start.toISOString(),
        end: end.toISOString(),
      }, signal),
    enabled: canView && enabled,
    staleTime: 60_000,
  });
}
