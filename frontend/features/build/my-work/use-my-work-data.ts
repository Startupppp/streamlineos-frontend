"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { isPast, isToday, parseISO } from "date-fns";
import { useAllWork } from "@/hooks/api/build/all-work";
import type { AllWorkTicket } from "@/types/projects";
import {
  useBuildListUrlState,
  type BuildListSortField,
  type BuildListSortDirection,
  type BuildListGrouping,
} from "@/features/build/shared/use-build-list-url-state";
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

function tabToDefaultSort(tab: WorkTab): {
  field: BuildListSortField;
  dir: BuildListSortDirection;
} {
  if (tab === "created") return { field: "created", dir: "desc" };
  if (tab === "subscribed" || tab === "activity")
    return { field: "updated", dir: "desc" };
  return { field: "rank", dir: "desc" };
}

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

function toDueBucketMap(
  tickets: AllWorkTicket[],
): Record<DueBucket, AllWorkTicket[]> {
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
}

export function useMyWorkData({
  activeTab,
  activeView,
}: UseMyWorkDataOptions) {
  const searchParams = useSearchParams();
  const defaults = tabToDefaultSort(activeTab);

  const urlState = useBuildListUrlState({
    limit: 50,
    defaultSortField: defaults.field,
    defaultSortDirection: defaults.dir,
  });

  const legacyCycle = searchParams.get("cycle");
  const baseFilters = useMemo(
    () => ({
      ...urlState.filters,
      ...(!urlState.filters.cycleId && legacyCycle
        ? { cycleId: legacyCycle }
        : {}),
    }),
    [urlState.filters, legacyCycle],
  );

  const assignedFilters = useMemo(
    () => ({ ...baseFilters, scope: "mine" as const }),
    [baseFilters],
  );
  const createdFilters = useMemo(
    () => ({ ...baseFilters, scope: "created" as const }),
    [baseFilters],
  );
  const subscribedFilters = useMemo(
    () => ({ ...baseFilters, scope: "subscribed" as const }),
    [baseFilters],
  );
  const activityFilters = useMemo(
    () => ({ ...baseFilters, scope: "mine" as const }),
    [baseFilters],
  );

  const {
    data: assignedData,
    isLoading: assignedLoading,
    isError: assignedError,
    error: assignedFailure,
    refetch: refetchAssigned,
  } = useAllWork(assignedFilters, { enabled: activeTab === "assigned" });
  const {
    data: createdData,
    isLoading: createdLoading,
    isError: createdError,
    error: createdFailure,
    refetch: refetchCreated,
  } = useAllWork(createdFilters, { enabled: activeTab === "created" });
  const {
    data: subscribedData,
    isLoading: subscribedLoading,
    isError: subscribedError,
    error: subscribedFailure,
    refetch: refetchSubscribed,
  } = useAllWork(subscribedFilters, { enabled: activeTab === "subscribed" });
  const {
    data: activityData,
    isLoading: activityLoading,
    isError: activityError,
    error: activityFailure,
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

  const error =
    activeTab === "assigned"
      ? assignedFailure
      : activeTab === "created"
        ? createdFailure
        : activeTab === "subscribed"
          ? subscribedFailure
          : activityFailure;

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
  }, [
    activeTab,
    refetchAssigned,
    refetchCreated,
    refetchSubscribed,
    refetchActivity,
  ]);

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
  const isEmpty =
    !isLoading &&
    !isError &&
    (!activeData?.data || activeData.data.length === 0);

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
    hasActiveFilters: urlState.hasActiveFilters,
    isLoading,
    isError,
    error,
    isEmpty,
    activeData,
    handleRetry,
    filtersActive: urlState.hasActiveFilters,
    handleClearFilters: urlState.clearFilters,
    setListParams: urlState.setListParams,
    setCursor: urlState.setCursor,
    sortField: urlState.sortField,
    sortDirection: urlState.sortDirection,
    grouping: urlState.grouping as BuildListGrouping,
    cursor: urlState.cursor,
    isPending: urlState.isPending,
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
