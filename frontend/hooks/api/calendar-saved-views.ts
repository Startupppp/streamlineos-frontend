"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAccess } from "@/hooks/api/access";
import { grantsPermission } from "@/lib/rbac/permission-gate";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import type {
  CalendarSavedView,
  CalendarSavedViewDefinition,
  CalendarSavedViewList,
} from "./calendar-saved-view-schema";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const listContract = lazyContract(() =>
  import("./calendar-saved-view-schema").then(
    (module) => module.calendarSavedViewListContract,
  ),
);
const itemContract = lazyContract(() =>
  import("./calendar-saved-view-schema").then(
    (module) => module.calendarSavedViewContract,
  ),
);
const removeContract = lazyContract(() =>
  import("./calendar-saved-view-schema").then(
    (module) => module.calendarSavedViewRemoveContract,
  ),
);

export function useCalendarSavedViews(enabled = true) {
  const { data: session } = useSession();
  const { data: access } = useAccess();
  const canRead = grantsPermission(access, "calendar:read");
  return useInfiniteQuery({
    queryKey: platformHierarchyQueryKeys.calendar.savedViewsForAccess(
      access?.membershipId ?? null,
      access?.version ?? 0,
      access?.scopes["calendar:read"] ?? "none",
      access?.scopes["directory:people:view"] ?? "none",
      access?.scopes["calendar:admin:manage"] ?? "none",
      access?.isOrgOwner ?? false,
    ),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<CalendarSavedViewList>(
        "/calendar/saved-views",
        pageParam !== NO_CURSOR_YET ? { cursor: pageParam } : {},
        signal,
        listContract,
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30_000,
    throwOnError: false,
    enabled: Boolean(session?.orgId && session.user?.id) && canRead && enabled,
  });
}

export function useCreateCalendarSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...platformHierarchyQueryKeys.calendar.savedViews, "create"],
    mutationFn: (input: {
      name: string;
      scope: "personal" | "team";
      definition: CalendarSavedViewDefinition;
    }) =>
      apiClient.post<CalendarSavedView>(
        "/calendar/saved-views",
        input,
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        itemContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: platformHierarchyQueryKeys.calendar.savedViews,
      }),
  });
}

export function useUpdateCalendarSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...platformHierarchyQueryKeys.calendar.savedViews, "update"],
    mutationFn: (input: {
      id: string;
      version: number;
      name?: string;
      scope?: "personal" | "team";
      definition?: CalendarSavedViewDefinition;
    }) =>
      apiClient.patch<CalendarSavedView>(
        `/calendar/saved-views/${encodeURIComponent(input.id)}`,
        {
          version: input.version,
          name: input.name,
          scope: input.scope,
          definition: input.definition,
        },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        itemContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: platformHierarchyQueryKeys.calendar.savedViews,
      }),
  });
}

export function useDeleteCalendarSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...platformHierarchyQueryKeys.calendar.savedViews, "delete"],
    mutationFn: (input: { id: string; version: number }) =>
      apiClient.delete<{ removed: boolean }>(
        `/calendar/saved-views/${encodeURIComponent(input.id)}`,
        { version: input.version },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        removeContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: platformHierarchyQueryKeys.calendar.savedViews,
      }),
  });
}
