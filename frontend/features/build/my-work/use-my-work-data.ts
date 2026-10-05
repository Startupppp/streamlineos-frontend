"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { addDays, format, subDays } from "date-fns";
import { useAllWork } from "@/hooks/api/build/all-work";
import { useBuildListUrlState } from "@/features/build/shared/use-build-list-url-state";
import { parseMyWorkView } from "./my-work-view";
import { mapAllWorkTicketToKanban, buildTicketMetaMap } from "./map-all-work-ticket";
import {
  type WorkTab,
  tabToDefaultSort,
  toDueBucketMap,
  EMPTY_TITLE_MAP,
  EMPTY_DESCRIPTION_MAP,
  SHOW_VIEW_SWITCHER_TABS,
} from "./my-work-data-model";

export { type WorkTab, WORK_TABS, TAB_CONFIG, parseWorkTab } from "./my-work-data-model";
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
    showViewSwitcher: SHOW_VIEW_SWITCHER_TABS.has(activeTab),
    showBucketList: activeTab === "assigned" && activeView === "list",
    emptyTitle: EMPTY_TITLE_MAP[activeTab],
    emptyDescription: EMPTY_DESCRIPTION_MAP[activeTab],
  };
}

export { parseMyWorkView };
