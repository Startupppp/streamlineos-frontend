"use client";

import { useMemo, useCallback, type UIEvent } from "react";
import { useSearchParams } from "next/navigation";
import { format, subDays } from "date-fns";
import { useProjects } from "@/hooks/api/build/projects";
import type { ProjectFilters } from "@/types/projects";
import {
  COMMAND_CENTER_MY_ISSUES_FILTERS,
  useAllWork,
  useInfiniteAllWork,
} from "@/hooks/api/build/all-work";
import {
  MY_ISSUES_LOAD_MORE_THRESHOLD,
} from "./command-center-constants";
import { mapAllWorkTicketToMyWorkItem, resolveDueWindow } from "./command-center-utils";
import {
  isCommandCenterHealth,
  isCommandCenterScope,
  resolveProjectsStatValue,
  type CommandCenterHealth,
  type CommandCenterScope,
} from "./command-center-model";

export function useCommandCenterData(canViewTickets: boolean) {
  const searchParams = useSearchParams();
  const rawUrlScope = searchParams.get("scope");
  const urlScope: CommandCenterScope | null =
    rawUrlScope !== null && isCommandCenterScope(rawUrlScope) ? rawUrlScope : null;
  const urlOwner = searchParams.get("owner") ?? undefined;
  const rawUrlHealth = searchParams.get("health");
  const urlHealth: CommandCenterHealth | undefined =
    rawUrlHealth !== null && isCommandCenterHealth(rawUrlHealth) ? rawUrlHealth : undefined;
  const urlDue = searchParams.get("due");
  const overdueDueDateTo = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const projectFilters: ProjectFilters = useMemo(
    () => ({
      status: "ACTIVE",
      managerId: urlOwner,
      ...(urlHealth === undefined ? {} : { health: urlHealth }),
    }),
    [urlOwner, urlHealth],
  );

  const {
    data: projectsData,
    isLoading: projectsLoading,
    isError: projectsError,
    error: projectsRawError,
    refetch: refetchProjects,
  } = useProjects(projectFilters, { throwOnError: false });

  const myIssuesScopeFilters = useMemo(
    () =>
      urlScope !== null
        ? { ...COMMAND_CENTER_MY_ISSUES_FILTERS, scope: urlScope }
        : COMMAND_CENTER_MY_ISSUES_FILTERS,
    [urlScope],
  );

  const myIssuesFilters = useMemo(
    () => ({
      ...myIssuesScopeFilters,
      ...(resolveDueWindow(urlDue, new Date()) ?? {}),
    }),
    [myIssuesScopeFilters, urlDue],
  );

  const {
    data: myIssuesPages,
    isLoading: myIssuesLoading,
    isError: myIssuesError,
    error: myIssuesRawError,
    refetch: refetchMyIssues,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteAllWork(myIssuesFilters, { enabled: canViewTickets, throwOnError: false });

  const { data: overdueIssuesSummary, refetch: refetchOverdueIssuesSummary } =
    useAllWork(
      { ...myIssuesScopeFilters, limit: 1, dueDateTo: overdueDueDateTo },
      { enabled: canViewTickets, throwOnError: false },
    );

  const projects = useMemo(() => projectsData?.data ?? [], [projectsData]);

  const myWorkItems = useMemo(() => {
    if (!myIssuesPages?.pages) return [];
    return myIssuesPages.pages.flatMap((page) =>
      page.data.map(mapAllWorkTicketToMyWorkItem),
    );
  }, [myIssuesPages]);

  const stats = useMemo(() => {
    const projectList = projectsData?.data ?? [];
    return {
      activeProjects: resolveProjectsStatValue(
        projectList.length,
        projectsData?.hasMore ?? false,
      ),
      openIssues: myIssuesPages?.pages[0]?.total ?? myWorkItems.length,
      overdueIssues:
        overdueIssuesSummary?.total ?? overdueIssuesSummary?.data.length ?? 0,
    };
  }, [myIssuesPages, myWorkItems.length, projectsData, overdueIssuesSummary]);

  const handleRetryAll = useCallback(() => {
    void refetchProjects();
    void refetchMyIssues();
    void refetchOverdueIssuesSummary();
  }, [refetchMyIssues, refetchOverdueIssuesSummary, refetchProjects]);

  const handleMyIssuesRetry = useCallback(() => void refetchMyIssues(), [refetchMyIssues]);

  const handleMyIssuesScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom <= MY_ISSUES_LOAD_MORE_THRESHOLD && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  return {
    projects,
    myWorkItems,
    stats,
    projectsLoading,
    projectsError,
    projectsRawError,
    myIssuesLoading,
    myIssuesError,
    myIssuesRawError,
    isFetchingNextPage,
    refetchProjects,
    handleRetryAll,
    handleMyIssuesRetry,
    handleMyIssuesScroll,
  };
}
