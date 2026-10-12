"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { portalApiClient, getPortalToken } from "@/lib/portal-api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import {
  PORTAL_CHILD_PAGE_SIZE,
  portalFilesPageSchema,
  portalRequestsPageSchema,
  portalUpdatesPageSchema,
  type PortalFile,
  type PortalRequest,
  type PortalUpdate,
} from "@/features/portal/lib/portal-child-pages";

interface PortalChildPage<T> {
  data: T[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

function usePortalChildPage<T>(
  projectId: number,
  segment: "updates" | "files" | "requests",
  parse: (raw: unknown) => PortalChildPage<T>,
) {
  const query = useInfiniteQuery({
    queryKey: [
      ...directoryAndOwnershipQueryKeys.portal.projectOverview(projectId),
      segment,
    ] as const,
    queryFn: async ({ pageParam }) => {
      const raw = await portalApiClient.get<unknown>(
        `/portal/v1/projects/${projectId}/${segment}`,
        pageParam === undefined
          ? { limit: PORTAL_CHILD_PAGE_SIZE }
          : { limit: PORTAL_CHILD_PAGE_SIZE, cursor: pageParam },
      );
      return parse(raw);
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage: PortalChildPage<T>) =>
      lastPage.pagination.nextCursor ?? undefined,
    enabled: typeof window !== "undefined" && !!getPortalToken() && projectId > 0,
    staleTime: 30_000,
  });

  const items = useMemo<T[]>(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );
  const hasMore = query.data?.pages.at(-1)?.pagination.hasMore ?? false;

  return { ...query, items, hasMore };
}

function parseUpdatesPage(raw: unknown): PortalChildPage<PortalUpdate> {
  return portalUpdatesPageSchema.parse(raw);
}

function parseFilesPage(raw: unknown): PortalChildPage<PortalFile> {
  return portalFilesPageSchema.parse(raw);
}

function parseRequestsPage(raw: unknown): PortalChildPage<PortalRequest> {
  return portalRequestsPageSchema.parse(raw);
}

export function usePortalProjectUpdates(projectId: number) {
  return usePortalChildPage(projectId, "updates", parseUpdatesPage);
}

export function usePortalProjectFiles(projectId: number) {
  return usePortalChildPage(projectId, "files", parseFilesPage);
}

export function usePortalProjectRequests(projectId: number) {
  return usePortalChildPage(projectId, "requests", parseRequestsPage);
}
