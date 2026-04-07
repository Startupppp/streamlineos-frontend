"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  DashboardStats,
  RecentProject,
  TeamMember,
  SprintSummary,
  RecentActivity,
  MyIssue,
} from "@/types/dashboard";

export const useHrDashboardStats = (
  options?: Omit<UseQueryOptions<DashboardStats, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<DashboardStats, Error>({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => apiClient.get<DashboardStats>("/dashboard/stats"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useDashboardStats = (
  options?: Omit<UseQueryOptions<DashboardStats, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<DashboardStats, Error>({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => apiClient.get<DashboardStats>("/dashboard/stats"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useMyIssues = (
  userId: string,
  options?: Omit<UseQueryOptions<MyIssue[], Error>, "queryKey" | "queryFn" | "enabled">
) => {
  return useQuery<MyIssue[], Error>({
    queryKey: queryKeys.dashboard.myIssues(userId),
    queryFn: () =>
      apiClient.get<MyIssue[]>("/dashboard/my-issues", { userId, limit: "20" }),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useRoleStats = (
  options?: Omit<UseQueryOptions<Record<string, number>, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<Record<string, number>, Error>({
    queryKey: [...queryKeys.dashboard.all, "roleStats"] as const,
    queryFn: () => apiClient.get<Record<string, number>>("/dashboard/role-stats"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

interface ScheduledActivity {
  type: string;
  subject: string | null;
}

export const useTodayActivities = (
  options?: Omit<UseQueryOptions<ScheduledActivity[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<ScheduledActivity[], Error>({
    queryKey: [...queryKeys.dashboard.all, "todayActivities"] as const,
    queryFn: () => apiClient.get<ScheduledActivity[]>("/dashboard/today-activities"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useRecentProjects = (
  options?: Omit<
    UseQueryOptions<RecentProject[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<RecentProject[], Error>({
    queryKey: queryKeys.dashboard.recentProjects(),
    queryFn: () => apiClient.get<RecentProject[]>("/dashboard/recent-projects"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useTeamAvailability = (
  options?: Omit<UseQueryOptions<TeamMember[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<TeamMember[], Error>({
    queryKey: queryKeys.dashboard.teamAvailability(),
    queryFn: () => apiClient.get<TeamMember[]>("/dashboard/team-availability"),
    refetchInterval: 30_000,
    staleTime: 15_000,
    ...options,
  });
};

export const useActiveSprintSummary = (
  options?: Omit<
    UseQueryOptions<SprintSummary | null, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<SprintSummary | null, Error>({
    queryKey: queryKeys.dashboard.activeSprintSummary(),
    queryFn: () =>
      apiClient.get<SprintSummary | null>("/dashboard/active-sprint"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useRecentActivity = (
  options?: Omit<
    UseQueryOptions<RecentActivity[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<RecentActivity[], Error>({
    queryKey: queryKeys.dashboard.recentActivity(),
    queryFn: () =>
      apiClient.get<RecentActivity[]>("/dashboard/recent-activity"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
