"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { z } from "zod";
import { portalApiClient, getPortalToken } from "@/lib/portal-api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

export const backendPortalProjectSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  key: z.string(),
  status: z.string(),
  startDate: z.string().nullable(),
  targetEndDate: z.string().nullable(),
});

export const backendPortalProjectListSchema = z.object({
  data: z.array(backendPortalProjectSchema),
  hasMore: z.boolean(),
  nextCursor: z.number().int().nullable(),
});

export type BackendPortalProject = z.infer<typeof backendPortalProjectSchema>;

export interface PortalProjectsFilters {
  name?: string;
  status?: string;
  waiting?: boolean;
}

export const portalProjectsQueryOptions = {
  queryKey: directoryAndOwnershipQueryKeys.portal.projects(),
} as const;

export function useExternalPortalProjects(filters?: PortalProjectsFilters) {
  const params = filters ?? {};
  const queryKey = directoryAndOwnershipQueryKeys.portal.projects(
    Object.keys(params).length > 0 ? params : undefined,
  );

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const reqParams: Record<string, unknown> = {};
      if (pageParam !== undefined) reqParams["cursor"] = pageParam;
      if (params.name) reqParams["name"] = params.name;
      if (params.status) reqParams["status"] = params.status;
      if (params.waiting !== undefined) reqParams["waiting"] = String(params.waiting);
      const raw = await portalApiClient.get<unknown>("/portal/v1/projects", reqParams);
      return backendPortalProjectListSchema.parse(raw);
    },
    initialPageParam: NO_ID_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: typeof window !== "undefined" && !!getPortalToken(),
    staleTime: 30_000,
  });
}
