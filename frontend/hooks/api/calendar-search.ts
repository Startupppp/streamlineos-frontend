"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import type { CalendarSearchResponse } from "./calendar-types";

const responseContract = lazyContract(() =>
  import("./calendar-schema").then(
    (module) => module.calendarSearchResponseContract,
  ),
);

export interface CalendarSearchFilters {
  start: string;
  end: string;
  query?: string;
  sourceKey?: string;
  status?: string;
  projectId?: string;
  ownerMembershipId?: string;
  location?: string;
  actionable?: "true" | "false";
}

export function useCalendarSearch(
  filters: CalendarSearchFilters,
  enabled = true,
) {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  const canView = useCan("calendar:read");
  return useInfiniteQuery({
    queryKey: platformHierarchyQueryKeys.calendar.search(filters),
    initialPageParam: "" as string,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<CalendarSearchResponse>(
        "/calendar/search",
        { ...filters, ...(pageParam ? { cursor: pageParam } : {}) },
        signal,
        responseContract,
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30_000,
    enabled: Boolean(orgId && userId) && canView && enabled,
  });
}
