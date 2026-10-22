"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useAccess } from "@/hooks/api/access";
import { grantsPermission } from "@/lib/rbac/permission-gate";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import type { CalendarSearchResponse } from "./calendar-types";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const responseContract = lazyContract(() =>
  import("./calendar-schema").then(
    (module) => module.calendarSearchResponseContract,
  ),
);

export interface CalendarSearchFilters {
  start: string;
  end: string;
  timeZone?: string;
  query?: string;
  sourceKey?: string;
  status?: string;
  projectId?: string;
  ownerMembershipId?: string;
  location?: string;
  actionable?: "true" | "false";
  hiddenConnectionIds?: string;
}

export function useCalendarSearch(
  filters: CalendarSearchFilters,
  enabled = true,
) {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  const { data: access } = useAccess();
  const canView = grantsPermission(access, "calendar:read");
  const requestFilters = {
    ...filters,
    timeZone: filters.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  };
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: platformHierarchyQueryKeys.calendar.search(
      orgId,
      userId,
      access?.membershipId ?? null,
      access?.version ?? 0,
      access?.scopes["calendar:read"] ?? "none",
      canView,
      requestFilters,
    ),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<CalendarSearchResponse>(
        "/calendar/search",
        { ...requestFilters, ...(pageParam !== NO_CURSOR_YET ? { cursor: pageParam } : {}) },
        signal,
        responseContract,
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30_000,
    enabled: Boolean(orgId && userId) && canView && enabled,
  });
}
