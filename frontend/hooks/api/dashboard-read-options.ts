import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";

export function dashboardStatsQueryOptions() {
  return {
    queryKey: collaborationQueryKeys.dashboard.stats(),
    staleTime: 5 * 60_000,
  };
}

export function myIssuesQueryOptions() {
  return {
    queryKey: collaborationQueryKeys.dashboard.myIssues(),
    staleTime: 5 * 60_000,
  };
}

export function personalDashboardQueryOptions() {
  return {
    queryKey: collaborationQueryKeys.dashboard.personal(),
    staleTime: 2 * 60_000,
  };
}

export function publicDocumentsQueryOptions(limit: number) {
  return {
    queryKey: collaborationQueryKeys.dashboard.publicDocuments(limit),
    staleTime: 5 * 60_000,
  };
}
