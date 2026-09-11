"use client";

import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { isPast, isToday, parseISO } from "date-fns";
import { useAllWork } from "@/hooks/api/build/all-work";
import type { AllWorkTicket } from "@/types/projects";
import { parseMyWorkView } from "./my-work-view";
import { mapAllWorkTicketToKanban, buildTicketMetaMap } from "./map-all-work-ticket";
import type { DueBucket } from "./my-work-rows";

export type WorkTab = "assigned" | "created" | "subscribed" | "activity";

export const WORK_TABS: readonly WorkTab[] = [
  "assigned",
  "created",
  "subscribed",
  "activity",
];

export const TAB_CONFIG: Record<WorkTab, { label: string }> = {
  assigned: { label: "Assigned" },
  created: { label: "Created" },
  subscribed: { label: "Subscribed" },
  activity: { label: "Activity" },
};

export function parseWorkTab(value: string | null): WorkTab {
  if (value === "created" || value === "subscribed" || value === "activity")
    return value;
  return "assigned";
}

export const MY_WORK_FILTER_PARAMS = [
  "q",
  "status",
  "priority",
  "type",
  "assigneeId",
  "labels",
  "cycle",
  "projectIds",
  "sprintId",
  "dueDateFrom",
  "dueDateTo",
] as const;

function getDueBucket(dueDate: string | null): DueBucket {
  if (!dueDate) return "none";
  try {
    const d = parseISO(dueDate);
    if (isToday(d)) return "today";
    if (isPast(d)) return "overdue";
    return "upcoming";
  } catch {
    return "none";
  }
}

function buildAllWorkFilters(params: URLSearchParams) {
  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const priority = params.get("priority") ?? "";
  const type = params.get("type") ?? "";
  const assigneeId = params.get("assigneeId") ?? "";
  const labels = params.get("labels") ?? "";
  const projectIds = params.get("projectIds") ?? "";
  return {
    ...(q ? { search: q } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(type ? { type } : {}),
    ...(assigneeId ? { assigneeId } : {}),
    ...(labels ? { labelIds: labels } : {}),
    ...(projectIds ? { projectIds } : {}),
  };
}

function toDueBucketMap(tickets: AllWorkTicket[]): Record<DueBucket, AllWorkTicket[]> {
  const buckets: Record<DueBucket, AllWorkTicket[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    none: [],
  };
  for (const t of tickets) buckets[getDueBucket(t.dueDate)].push(t);
  return buckets;
}

interface UseMyWorkDataOptions {
  activeTab: WorkTab;
  activeView: string;
  pmWorkspaceId?: string;
}

export function useMyWorkData({ activeTab, activeView, pmWorkspaceId }: UseMyWorkDataOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasActiveFilters = useMemo(
    () =>
      MY_WORK_FILTER_PARAMS.some((p) => {
        const v = searchParams.get(p);
        return v !== null && v !== "";
      }),
    [searchParams],
  );

  const extraFilters = useMemo(() => buildAllWorkFilters(searchParams), [searchParams]);

  const assignedFilters = useMemo(
    () => ({
      scope: "mine" as const,
      ...extraFilters,
      ...(pmWorkspaceId ? { pmWorkspaceId } : {}),
      limit: 100,
    }),
    [extraFilters, pmWorkspaceId],
  );
  const createdFilters = useMemo(
    () => ({
      scope: "created" as const,
      ...extraFilters,
      ...(pmWorkspaceId ? { pmWorkspaceId } : {}),
      orderBy: "created" as const,
      orderDir: "desc" as const,
      limit: 100,
    }),
    [extraFilters, pmWorkspaceId],
  );
  const subscribedFilters = useMemo(
    () => ({
      scope: "subscribed" as const,
      ...extraFilters,
      ...(pmWorkspaceId ? { pmWorkspaceId } : {}),
      orderBy: "updated" as const,
      orderDir: "desc" as const,
      limit: 100,
    }),
    [extraFilters, pmWorkspaceId],
  );
  const activityFilters = useMemo(
    () => ({
      scope: "mine" as const,
      ...extraFilters,
      ...(pmWorkspaceId ? { pmWorkspaceId } : {}),
      orderBy: "updated" as const,
      orderDir: "desc" as const,
      limit: 100,
    }),
    [extraFilters, pmWorkspaceId],
  );

  const {
    data: assignedData,
    isLoading: assignedLoading,
    isError: assignedError,
    refetch: refetchAssigned,
  } = useAllWork(assignedFilters, { enabled: activeTab === "assigned" });
  const {
    data: createdData,
    isLoading: createdLoading,
    isError: createdError,
    refetch: refetchCreated,
  } = useAllWork(createdFilters, { enabled: activeTab === "created" });
  const {
    data: subscribedData,
    isLoading: subscribedLoading,
    isError: subscribedError,
    refetch: refetchSubscribed,
  } = useAllWork(subscribedFilters, { enabled: activeTab === "subscribed" });
  const {
    data: activityData,
    isLoading: activityLoading,
    isError: activityError,
    refetch: refetchActivity,
  } = useAllWork(activityFilters, { enabled: activeTab === "activity" });

  const isLoading =
    activeTab === "assigned"
      ? assignedLoading
      : activeTab === "created"
        ? createdLoading
        : activeTab === "subscribed"
          ? subscribedLoading
          : activityLoading;

  const isError =
    activeTab === "assigned"
      ? assignedError
      : activeTab === "created"
        ? createdError
        : activeTab === "subscribed"
          ? subscribedError
          : activityError;

  const activeData =
    activeTab === "assigned"
      ? assignedData
      : activeTab === "created"
        ? createdData
        : activeTab === "subscribed"
          ? subscribedData
          : activityData;

  const handleRetry = useCallback(() => {
    if (activeTab === "assigned") void refetchAssigned();
    else if (activeTab === "created") void refetchCreated();
    else if (activeTab === "subscribed") void refetchSubscribed();
    else void refetchActivity();
  }, [activeTab, refetchAssigned, refetchCreated, refetchSubscribed, refetchActivity]);

  const filtersActive = Object.keys(extraFilters).length > 0;

  const handleClearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const param of MY_WORK_FILTER_PARAMS) params.delete(param);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  const kanbanTickets = useMemo(() => {
    if (!activeData?.data) return [];
    return activeData.data.map(mapAllWorkTicketToKanban);
  }, [activeData]);

  const ticketMeta = useMemo(() => {
    if (!activeData?.data) return buildTicketMetaMap([]);
    return buildTicketMetaMap(activeData.data);
  }, [activeData]);

  const dueBuckets = useMemo(() => {
    if (activeTab !== "assigned" || activeView !== "list") return null;
    if (!activeData?.data) return null;
    return toDueBucketMap(activeData.data);
  }, [activeTab, activeView, activeData]);

  const showViewSwitcher = activeTab === "assigned";
  const showBucketList = activeTab === "assigned" && activeView === "list";

  const emptyTitle =
    activeTab === "created"
      ? "No tickets created by you"
      : activeTab === "subscribed"
        ? "No subscribed tickets"
        : activeTab === "activity"
          ? "No recently updated tickets"
          : "Nothing assigned to you";

  const emptyDescription =
    activeTab === "created"
      ? "Tickets you reported or created across all projects will appear here."
      : activeTab === "subscribed"
        ? "Tickets you are watching will appear here."
        : activeTab === "activity"
          ? "Your recently updated assigned tickets will appear here."
          : "Tickets assigned to you across all projects will appear here.";

  return {
    hasActiveFilters,
    isLoading,
    isError,
    activeData,
    handleRetry,
    filtersActive,
    handleClearFilters,
    kanbanTickets,
    ticketMeta,
    dueBuckets,
    showViewSwitcher,
    showBucketList,
    emptyTitle,
    emptyDescription,
  };
}

export { parseMyWorkView };
