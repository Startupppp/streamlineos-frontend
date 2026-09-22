import { useQuery, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { portalApiClient, getPortalToken } from "@/lib/portal-api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import type { PortalProject } from "@/features/portal/lib/portal-types";

const backendPortalProjectSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  key: z.string(),
  status: z.string(),
  startDate: z.string().nullable(),
  targetEndDate: z.string().nullable(),
});

const backendPortalProjectListSchema = z.array(backendPortalProjectSchema);

export const portalProjectsQueryOptions = queryOptions({
  queryKey: directoryAndOwnershipQueryKeys.portal.projects(),
  queryFn: async (): Promise<PortalProject[]> => {
    const raw = await portalApiClient.get<unknown>("/portal/v1/projects");
    return backendPortalProjectListSchema.parse(raw);
  },
  staleTime: 1000 * 60 * 2,
});

export function useExternalPortalProjects() {
  return useQuery({
    ...portalProjectsQueryOptions,
    enabled: typeof window !== "undefined" && !!getPortalToken(),
    staleTime: 30_000,
  });
}
