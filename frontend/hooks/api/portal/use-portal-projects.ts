import { useQuery, queryOptions } from "@tanstack/react-query";
import { portalApiClient, getPortalToken } from "@/lib/portal-api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import type { PortalProject } from "@/features/portal/lib/portal-types";

export const portalProjectsQueryOptions = queryOptions({
  queryKey: directoryAndOwnershipQueryKeys.portal.projects(),
  queryFn: () => portalApiClient.get<PortalProject[]>("/portal/v1/projects"),
  staleTime: 1000 * 60 * 2,
});

export function useExternalPortalProjects() {
  return useQuery({
    ...portalProjectsQueryOptions,
    enabled: typeof window !== "undefined" && !!getPortalToken(),
    staleTime: 30_000,
  });
}
