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
