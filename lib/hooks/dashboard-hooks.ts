import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { vaivammTrpcClient } from "../trpc";
import { vaivammKeys } from "./trpc-keys";
import type { DashboardRouterOutputs } from "./trpc-keys";

export const useDashboardStats = (
  options?: Omit<
    UseQueryOptions<DashboardRouterOutputs["getStats"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<DashboardRouterOutputs["getStats"], Error>({
    queryKey: vaivammKeys.dashboard.stats(),
    queryFn: () => vaivammTrpcClient.dashboard.getStats.query(),
    ...options,
  });
};

export const useRecentProjects = (
  options?: Omit<
    UseQueryOptions<DashboardRouterOutputs["getRecentProjects"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<DashboardRouterOutputs["getRecentProjects"], Error>({
    queryKey: vaivammKeys.dashboard.recentProjects(),
    queryFn: () => vaivammTrpcClient.dashboard.getRecentProjects.query(),
    ...options,
  });
};

export const useTeamAvailability = (
  options?: Omit<
    UseQueryOptions<DashboardRouterOutputs["getTeamAvailability"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<DashboardRouterOutputs["getTeamAvailability"], Error>({
    queryKey: vaivammKeys.dashboard.teamAvailability(),
    queryFn: () => vaivammTrpcClient.dashboard.getTeamAvailability.query(),
    refetchInterval: 30_000,
    staleTime: 15_000,
    ...options,
  });
};

export const useActiveSprintSummary = (
  options?: Omit<
    UseQueryOptions<DashboardRouterOutputs["getActiveSprintSummary"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<DashboardRouterOutputs["getActiveSprintSummary"], Error>({
    queryKey: vaivammKeys.dashboard.activeSprintSummary(),
    queryFn: () => vaivammTrpcClient.dashboard.getActiveSprintSummary.query(),
    ...options,
  });
};

export const useRecentActivity = (
  options?: Omit<
    UseQueryOptions<DashboardRouterOutputs["getRecentActivity"], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<DashboardRouterOutputs["getRecentActivity"], Error>({
    queryKey: vaivammKeys.dashboard.recentActivity(),
    queryFn: () => vaivammTrpcClient.dashboard.getRecentActivity.query(),
    ...options,
  });
};
