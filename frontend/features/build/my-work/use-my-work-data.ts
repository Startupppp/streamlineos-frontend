"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { addDays, format, isPast, isToday, parseISO, subDays } from "date-fns";
import { useAllWork } from "@/hooks/api/build/all-work";
import type { AllWorkTicket } from "@/types/projects";
import {
  useBuildListUrlState,
  type BuildListSortField,
  type BuildListSortDirection,
} from "@/features/build/shared/use-build-list-url-state";
import { parseMyWorkView } from "./my-work-view";
import { mapAllWorkTicketToKanban, buildTicketMetaMap } from "./map-all-work-ticket";
import type { DueBucket } from "./my-work-rows";

export type WorkTab =
  | "assigned"
  | "created"
  | "subscribed"
  | "overdue"
  | "due-soon"
  | "activity"
  | "today"
  | "upcoming"
  | "blocked"
  | "waiting"
  | "done"
  | "snoozed";

export const WORK_TABS: readonly WorkTab[] = [
  "assigned",
  "created",
  "subscribed",
  "overdue",
  "due-soon",
  "activity",
  "today",
  "upcoming",
  "blocked",
  "waiting",
  "done",
  "snoozed",
];

export const TAB_CONFIG: Record<WorkTab, { label: string }> = {
  assigned: { label: "Assigned" },
  created: { label: "Created" },
  subscribed: { label: "Subscribed" },
  overdue: { label: "Overdue" },
  "due-soon": { label: "Due Soon" },
  activity: { label: "Activity" },
  today: { label: "Today" },
  upcoming: { label: "Upcoming" },
  blocked: { label: "Blocked" },
  waiting: { label: "Waiting" },
  done: { label: "Done" },
  snoozed: { label: "Snoozed" },
};

export function parseWorkTab(value: string | null): WorkTab {
  if (value === "created" || value === "overdue" || value === "due-soon" || value === "activity") return value;
  if (value === "subscribed" || value === "watching") return "subscribed";
  if (value === "today" || value === "upcoming" || value === "blocked" || value === "waiting" || value === "done" || value === "snoozed") return value;
  return "assigned";
}

function tabToDefaultSort(tab: WorkTab): {
  field: BuildListSortField;
  dir: BuildListSortDirection;
} {
  if (tab === "created") return { field: "created", dir: "desc" };
  if (tab === "overdue" || tab === "today" || tab === "upcoming") return { field: "dueDate", dir: "asc" };
  if (tab === "due-soon") return { field: "dueDate", dir: "asc" };
  if (tab === "subscribed" || tab === "activity") return { field: "updated", dir: "desc" };
  if (tab === "blocked" || tab === "waiting" || tab === "done") return { field: "updated", dir: "desc" };
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
  const overdueFilters = useMemo(
    () => ({
      ...baseFilters,
      scope: "mine" as const,
      dueDateTo: format(new Date(), "yyyy-MM-dd"),
      excludeStatus: "DONE,CANCELLED",
    }),
    [baseFilters],
  );
  const dueSoonFilters = useMemo(
    () => {
      const today = new Date();
      return {
        ...baseFilters,
        scope: "mine" as const,
        dueDateFrom: format(today, "yyyy-MM-dd"),
        dueDateTo: format(addDays(today, 7), "yyyy-MM-dd"),
        excludeStatus: "DONE,CANCELLED",
      };
    },
    [baseFilters],
  );
  const activityFilters = useMemo(
    () => ({ ...baseFilters, scope: "mine" as const }),
    [baseFilters],
  );
  const todayFilters = useMemo(
    () => ({
      ...baseFilters,
      scope: "mine" as const,
      dueDateFrom: format(new Date(), "yyyy-MM-dd"),
      dueDateTo: format(new Date(), "yyyy-MM-dd"),
      excludeStatus: "DONE,CANCELLED",
    }),
    [baseFilters],
  );
  const upcomingFilters = useMemo(
    () => ({
      ...baseFilters,
      scope: "mine" as const,
      dueDateFrom: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      dueDateTo: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      excludeStatus: "DONE,CANCELLED",
    }),
    [baseFilters],
  );
  const blockedFilters = useMemo(
    () => ({ ...baseFilters, scope: "mine" as const, blockingRelation: "true" }),
    [baseFilters],
  );
  const waitingFilters = useMemo(
    () => ({ ...baseFilters, scope: "mine" as const, status: "WAITING_FOR_REVIEW" }),
    [baseFilters],
  );
  const doneFilters = useMemo(
    () => ({
      ...baseFilters,
      scope: "mine" as const,
      status: "DONE",
      updatedAfter: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    }),
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
    data: overdueData,
    isLoading: overdueLoading,
    isError: overdueError,
    error: overdueFailure,
    refetch: refetchOverdue,
  } = useAllWork(overdueFilters, { enabled: activeTab === "overdue" });
  const {
    data: dueSoonData,
    isLoading: dueSoonLoading,
    isError: dueSoonError,
    error: dueSoonFailure,
    refetch: refetchDueSoon,
  } = useAllWork(dueSoonFilters, { enabled: activeTab === "due-soon" });
  const {
    data: activityData,
    isLoading: activityLoading,
    isError: activityError,
    error: activityFailure,
    refetch: refetchActivity,
  } = useAllWork(activityFilters, { enabled: activeTab === "activity" });
  const {
    data: todayData,
    isLoading: todayLoading,
    isError: todayError,
    error: todayFailure,
    refetch: refetchToday,
  } = useAllWork(todayFilters, { enabled: activeTab === "today" });
  const {
    data: upcomingData,
    isLoading: upcomingLoading,
    isError: upcomingError,
    error: upcomingFailure,
    refetch: refetchUpcoming,
  } = useAllWork(upcomingFilters, { enabled: activeTab === "upcoming" });
  const {
    data: blockedData,
    isLoading: blockedLoading,
    isError: blockedError,
    error: blockedFailure,
    refetch: refetchBlocked,
  } = useAllWork(blockedFilters, { enabled: activeTab === "blocked" });
  const {
    data: waitingData,
    isLoading: waitingLoading,
    isError: waitingError,
    error: waitingFailure,
    refetch: refetchWaiting,
  } = useAllWork(waitingFilters, { enabled: activeTab === "waiting" });
  const {
    data: doneData,
    isLoading: doneLoading,
    isError: doneError,
    error: doneFailure,
    refetch: refetchDone,
  } = useAllWork(doneFilters, { enabled: activeTab === "done" });

  const tabLoading: Record<WorkTab, boolean> = {
    assigned: assignedLoading, created: createdLoading, subscribed: subscribedLoading,
    overdue: overdueLoading, "due-soon": dueSoonLoading, activity: activityLoading,
    today: todayLoading, upcoming: upcomingLoading, blocked: blockedLoading,
    waiting: waitingLoading, done: doneLoading, snoozed: false,
  };
  const tabError: Record<WorkTab, boolean> = {
    assigned: assignedError, created: createdError, subscribed: subscribedError,
    overdue: overdueError, "due-soon": dueSoonError, activity: activityError,
    today: todayError, upcoming: upcomingError, blocked: blockedError,
    waiting: waitingError, done: doneError, snoozed: false,
  };
  const tabFailure: Record<WorkTab, unknown> = {
    assigned: assignedFailure, created: createdFailure, subscribed: subscribedFailure,
    overdue: overdueFailure, "due-soon": dueSoonFailure, activity: activityFailure,
    today: todayFailure, upcoming: upcomingFailure, blocked: blockedFailure,
    waiting: waitingFailure, done: doneFailure, snoozed: null,
  };
  const tabData: Record<WorkTab, typeof assignedData> = {
    assigned: assignedData, created: createdData, subscribed: subscribedData,
    overdue: overdueData, "due-soon": dueSoonData, activity: activityData,
    today: todayData, upcoming: upcomingData, blocked: blockedData,
    waiting: waitingData, done: doneData, snoozed: undefined,
  };

  const isLoading = tabLoading[activeTab];
  const isError = tabError[activeTab];
  const error = tabFailure[activeTab];
  const activeData = tabData[activeTab];

  const handleRetry = useCallback(() => {
    const refetchMap: Record<WorkTab, () => void> = {
      assigned: () => void refetchAssigned(), created: () => void refetchCreated(),
      subscribed: () => void refetchSubscribed(), overdue: () => void refetchOverdue(),
      "due-soon": () => void refetchDueSoon(), activity: () => void refetchActivity(),
      today: () => void refetchToday(), upcoming: () => void refetchUpcoming(),
      blocked: () => void refetchBlocked(), waiting: () => void refetchWaiting(),
      done: () => void refetchDone(), snoozed: () => {},
    };
    refetchMap[activeTab]?.();
  }, [
    activeTab,
    refetchAssigned, refetchCreated, refetchSubscribed, refetchOverdue,
    refetchDueSoon, refetchActivity, refetchToday, refetchUpcoming,
    refetchBlocked, refetchWaiting, refetchDone,
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
    if ((activeTab !== "assigned" && activeTab !== "overdue") || activeView !== "list") return null;
    if (!activeData?.data) return null;
    return toDueBucketMap(activeData.data);
  }, [activeTab, activeView, activeData]);

  const showBucketList = activeTab === "assigned" && activeView === "list";
  const isEmpty =
    !isLoading &&
    !isError &&
    (!activeData?.data || activeData.data.length === 0);

  const emptyTitleMap: Record<WorkTab, string> = {
    assigned: "Nothing assigned to you",
    created: "No tickets created by you",
    subscribed: "No subscribed tickets",
    overdue: "No overdue tickets",
    "due-soon": "Nothing due soon",
    activity: "No recently updated tickets",
    today: "Nothing due today",
    upcoming: "Nothing due this week",
    blocked: "No blocked tickets",
    waiting: "No tickets waiting for review",
    done: "Nothing completed recently",
    snoozed: "No snoozed tickets",
  };
  const emptyDescriptionMap: Record<WorkTab, string> = {
    assigned: "Tickets assigned to you across all projects will appear here.",
    created: "Tickets you reported or created across all projects will appear here.",
    subscribed: "Tickets you are watching will appear here.",
    overdue: "Tickets past their due date that are still open will appear here.",
    "due-soon": "Open tickets due today or within the next seven days will appear here.",
    activity: "Your recently updated assigned tickets will appear here.",
    today: "Assigned tickets with a due date of today will appear here.",
    upcoming: "Assigned tickets due in the next seven days will appear here.",
    blocked: "Tickets assigned to you that are blocked by other tickets will appear here.",
    waiting: "Assigned tickets currently waiting for review will appear here.",
    done: "Assigned tickets completed in the last 30 days will appear here.",
    snoozed: "Tickets you have snoozed will appear here.",
  };

  const showViewSwitcherTabs: Set<WorkTab> = new Set([
    "assigned", "overdue", "due-soon", "today", "upcoming", "blocked", "waiting", "done",
  ]);

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
    grouping: urlState.grouping,
    cursor: urlState.cursor,
    isPending: urlState.isPending,
    kanbanTickets,
    ticketMeta,
    dueBuckets,
    showViewSwitcher: showViewSwitcherTabs.has(activeTab),
    showBucketList: activeTab === "assigned" && activeView === "list",
    emptyTitle: emptyTitleMap[activeTab],
    emptyDescription: emptyDescriptionMap[activeTab],
  };
}

export { parseMyWorkView };
