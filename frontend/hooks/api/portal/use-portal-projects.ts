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

const PORTAL_PROJECTS_KEY = directoryAndOwnershipQueryKeys.portal.projects();

export const portalProjectsQueryOptions = {
  queryKey: PORTAL_PROJECTS_KEY,
} as const;

export function useExternalPortalProjects() {
  return useInfiniteQuery({
    queryKey: PORTAL_PROJECTS_KEY,
    queryFn: async ({ pageParam }) => {
      const params: Record<string, unknown> = {};
      if (pageParam !== undefined) params["cursor"] = pageParam;
      const raw = await portalApiClient.get<unknown>("/portal/v1/projects", params);
      return backendPortalProjectListSchema.parse(raw);
    },
    initialPageParam: NO_ID_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: typeof window !== "undefined" && !!getPortalToken(),
    staleTime: 30_000,
  });
}
