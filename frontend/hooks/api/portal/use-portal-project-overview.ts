import { useQuery, queryOptions } from "@tanstack/react-query";
import { portalApiClient, getPortalToken } from "@/lib/portal-api-client";
import type { PortalProjectOverview } from "@/features/portal/lib/portal-types";

export function portalProjectOverviewQueryOptions(projectId: number) {
  return queryOptions({
    queryKey: ["portal", "projects", projectId, "overview"] as const,
    queryFn: () =>
      portalApiClient.get<PortalProjectOverview>(
        `/portal/v1/projects/${projectId}/overview`,
      ),
    staleTime: 1000 * 60,
  });
}

export function usePortalProjectOverview(projectId: number) {
  return useQuery({
    ...portalProjectOverviewQueryOptions(projectId),
    enabled: typeof window !== "undefined" && !!getPortalToken() && projectId > 0,
  });
}
