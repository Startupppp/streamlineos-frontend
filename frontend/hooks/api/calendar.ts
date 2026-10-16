"use client";

import { useEffect } from "react";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const calendarEventsResponseContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarEventsResponseContract),
);
const calendarHistoryResponseContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarHistoryResponseContract),
);
const calendarSourcesContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarSourcesContract),
);
const calendarSourcePreferenceContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarSourcePreferenceContract),
);
const calendarExternalEventsContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarExternalEventsContract),
);
const calendarOrgMembersContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.calendarOrgMembersContract),
);
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import {
  invalidateCalendarProjectionWindows,
  subscribeToCalendarProjectionChanges,
} from "@/lib/calendar-projection-cache";
import { useCan, usePermissionGate } from "@/hooks/api/access";
import type {
  CalendarOrgMember,
  CalendarSource,
  CalendarEventsResponse,
  CalendarHistoryResponse,
  ExternalCalendarEventsResponse,
} from "./calendar-types";
import { allowOfflineCalendarPolicy, clearOfflineCalendarSnapshot, revokeOfflineCalendarPolicy, saveOfflineCalendarSnapshot } from "@/lib/offline/calendar-offline-cache";
import { useCalendarOfflinePolicy } from "./calendar-offline-policy";

// ---- Re-exports — all public imports from this module remain intact ----
export type {
  CalendarOrgMember,
  CalendarOooConflict,
  CalendarEventConflict,
  CalendarListItem,
  CalendarEventDetail,
  ParsedCalendarEventId,
  CalendarEventsResponse,
  CalendarHistoryResponse,
  ExternalCalendarEvent,
  ExternalCalendarEventsResponse,
  CalendarSource,
  EventSyncStatusResponse,
} from "./calendar-types";
export {
  parseCalendarEventId,
  extractEventNumericId,
} from "./calendar-types";
export type { CreateCalendarEventPayload } from "./calendar-mutations";
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

export const MEMBER_PICKER_SEARCH_LIMIT = 25;
export const MEMBER_PICKER_ROSTER_LIMIT = 100;

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
  const requestedLimit =
    limit ?? (isSearch ? MEMBER_PICKER_SEARCH_LIMIT : MEMBER_PICKER_ROSTER_LIMIT);
  return useQuery({
    queryKey: isSearch
      ? platformHierarchyQueryKeys.calendar.memberSearch(term, requestedLimit)
      : platformHierarchyQueryKeys.calendar.orgMembers(requestedLimit),
    queryFn: ({ signal }) =>
      apiClient.get<CalendarOrgMember[]>(
        "/org/members",
        isSearch
          ? { search: term, limit: requestedLimit }
          : { limit: requestedLimit },
        signal,
        calendarOrgMembersContract,
      ),
    staleTime: isSearch ? 30 * 1000 : 5 * 60 * 1000,
    enabled: canView && enabled,
    placeholderData: isSearch ? keepPreviousData : undefined,
  });
}

// ---- Range-list hooks ----

export function useCalendarEvents(start: Date, end: Date, enabled = true) {
  const qc = useQueryClient();
  const { data: session, status: sessionStatus } = useSession();
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  const access = usePermissionGate("calendar:read");
  const canView = access.allowed;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const offlinePolicy = useCalendarOfflinePolicy(enabled);
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (orgId && userId) {
      try {
        const previous = sessionStorage.getItem("streamline-calendar-offline-session-identity");
        if (previous && previous !== `${orgId}:${userId}`) {
          sessionStorage.removeItem("streamline-calendar-offline-session-identity");
          void clearOfflineCalendarSnapshot().catch(() => undefined);
        }
      } catch {
        void clearOfflineCalendarSnapshot().catch(() => undefined);
      }
    }
    if (access.pending || access.unavailable) return;
    const identity = orgId && userId && canView ? `${orgId}:${userId}` : "";
    try {
      const previous = localStorage.getItem("streamline-calendar-offline-identity");
      if (previous && previous !== identity) void clearOfflineCalendarSnapshot().catch(() => undefined);
      if (identity) localStorage.setItem("streamline-calendar-offline-identity", identity);
      else localStorage.removeItem("streamline-calendar-offline-identity");
      if (identity) sessionStorage.setItem("streamline-calendar-offline-session-identity", identity);
      else sessionStorage.removeItem("streamline-calendar-offline-session-identity");
    } catch {
      void clearOfflineCalendarSnapshot().catch(() => undefined);
    }
  }, [orgId, userId, canView, access.pending, access.unavailable, sessionStatus]);
  useEffect(
    () => subscribeToCalendarProjectionChanges(
      () => invalidateCalendarProjectionWindows(qc, false),
    ),
    [qc],
  );
  const eventsQuery = useQuery({
    ...INLINE_READ_ERROR,
    queryKey: platformHierarchyQueryKeys.calendar.events(
      orgId,
      userId,
      start.toISOString(),
      end.toISOString(),
      undefined,
      timeZone,
    ),
    queryFn: async ({ signal }) => {
      const result = await apiClient.get<CalendarEventsResponse>("/calendar/events", {
        start: start.toISOString(),
        end: end.toISOString(),
        timeZone,
      }, signal, calendarEventsResponseContract);
      return result;
    },
    staleTime: 2 * 60 * 1000,
    enabled: Boolean(orgId && userId) && canView && enabled,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
  useEffect(() => {
    if (offlinePolicy.isError && navigator.onLine) {
      const identity = orgId && userId ? `${orgId}:${userId}` : "";
      try {
        if (sessionStorage.getItem("streamline-calendar-offline-session-identity") === identity)
          sessionStorage.removeItem("streamline-calendar-offline-session-identity");
        if (localStorage.getItem("streamline-calendar-offline-identity") === identity)
          localStorage.removeItem("streamline-calendar-offline-identity");
      } catch {}
      void clearOfflineCalendarSnapshot().catch(() => undefined);
      return;
    }
    if (offlinePolicy.data?.enabled === false) {
      const identity = orgId && userId ? `${orgId}:${userId}` : null;
      let activeIdentity = false;
      try { activeIdentity = Boolean(identity && localStorage.getItem("streamline-calendar-offline-identity") === identity); }
      catch {}
      if (identity) revokeOfflineCalendarPolicy(identity, offlinePolicy.data.version);
      if (activeIdentity) void clearOfflineCalendarSnapshot().catch(() => undefined);
      return;
    }
    if (offlinePolicy.data?.enabled && offlinePolicy.isFetchedAfterMount && !offlinePolicy.isFetching && !offlinePolicy.isError && eventsQuery.data && eventsQuery.isSuccess && eventsQuery.isFetchedAfterMount && !eventsQuery.isFetching && !eventsQuery.isError && eventsQuery.dataUpdatedAt > 0 && orgId && userId && canView && navigator.onLine) {
      const identity = `${orgId}:${userId}`;
      if (!allowOfflineCalendarPolicy(identity, offlinePolicy.data.version)) return;
      try {
        localStorage.setItem("streamline-calendar-offline-identity", identity);
        sessionStorage.setItem("streamline-calendar-offline-session-identity", identity);
      } catch { return; }
      void saveOfflineCalendarSnapshot(identity, start, end, eventsQuery.data, offlinePolicy.data, timeZone, eventsQuery.dataUpdatedAt).catch(() => undefined);
      if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, [offlinePolicy.data, offlinePolicy.isError, offlinePolicy.isFetching, offlinePolicy.isFetchedAfterMount, eventsQuery.data, eventsQuery.dataUpdatedAt, eventsQuery.isSuccess, eventsQuery.isFetchedAfterMount, eventsQuery.isFetching, eventsQuery.isError, orgId, userId, canView, start, end, timeZone]);
  return eventsQuery;
}

export function useCalendarHistory(before: string, enabled = true) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  const canView = useCan("calendar:read");
  useEffect(
    () => subscribeToCalendarProjectionChanges(
      () => invalidateCalendarProjectionWindows(qc, false),
    ),
    [qc],
  );
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: platformHierarchyQueryKeys.calendar.history(orgId, userId, before),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<CalendarHistoryResponse>(
        "/calendar/history",
        pageParam ? { cursor: pageParam } : { before },
        signal,
        calendarHistoryResponseContract,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 2 * 60 * 1000,
    enabled: Boolean(orgId && userId && before) && canView && enabled,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
}

export function useCalendarSources(enabled = true) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  const canView = useCan("calendar:read");
  useEffect(
    () => subscribeToCalendarProjectionChanges(
      () => { void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.sourcesAll }); },
    ),
    [qc],
  );
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: platformHierarchyQueryKeys.calendar.sources(orgId, userId),
    queryFn: ({ signal }) =>
      apiClient.get<CalendarSource[]>("/calendar/sources", undefined, signal, calendarSourcesContract),
    staleTime: 30_000,
    enabled: Boolean(orgId && userId) && canView && enabled,
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
        undefined,
        calendarSourcePreferenceContract,
      ),
    onMutate: async ({ sourceKey, enabled }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: platformHierarchyQueryKeys.calendar.sourcesAll }),
        qc.cancelQueries({ queryKey: platformHierarchyQueryKeys.calendar.eventsAll }),
      ]);
      const sources = qc.getQueriesData<CalendarSource[]>({
        queryKey: platformHierarchyQueryKeys.calendar.sourcesAll,
      });
      const eventWindows = qc.getQueriesData<CalendarEventsResponse>({
        queryKey: platformHierarchyQueryKeys.calendar.eventsAll,
      });
      qc.setQueriesData<CalendarSource[]>(
        { queryKey: platformHierarchyQueryKeys.calendar.sourcesAll },
        (current) => current?.map((source) =>
          source.key === sourceKey ? { ...source, enabled } : source,
        ),
      );
      if (!enabled) {
        qc.setQueriesData<CalendarEventsResponse>(
          { queryKey: platformHierarchyQueryKeys.calendar.eventsAll },
          (current) => current === undefined || !Array.isArray(current.events)
            ? current
            : {
                ...current,
                events: current.events.filter((event) => event.sourceKey !== sourceKey),
              },
        );
      }
      return { sources, eventWindows };
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, data] of context?.sources ?? []) {
        qc.setQueryData(queryKey, data);
      }
      for (const [queryKey, data] of context?.eventWindows ?? []) {
        qc.setQueryData(queryKey, data);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.sourcesAll });
      invalidateCalendarProjectionWindows(qc);
    },
  });
}

export function useExternalCalendarEvents(start: Date, end: Date, enabled: boolean) {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  const canView = useCan("calendar:read");
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: platformHierarchyQueryKeys.calendar.externalEvents(
      orgId,
      userId,
      start.toISOString(),
      end.toISOString(),
    ),
    queryFn: ({ signal }) =>
      apiClient.get<ExternalCalendarEventsResponse>("/calendar/external-events", {
        start: start.toISOString(),
        end: end.toISOString(),
      }, signal, calendarExternalEventsContract),
    enabled: Boolean(orgId && userId) && canView && enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
}
