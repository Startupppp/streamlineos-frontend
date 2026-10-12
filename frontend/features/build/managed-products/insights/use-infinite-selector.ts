"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type {
  ManagedProductRelationsListLinkedProjectsResponse,
  DiscoveryListOpportunitiesResponse,
  ProjectsRoadmapListRoadmapResponse,
} from "@/contracts/build-contracts.generated";

const projectsPageC = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductRelationsListLinkedProjectsResponseSchema,
  ),
);
const opportunitiesPageC = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryListOpportunitiesResponseSchema,
  ),
);
const roadmapPageC = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.projectsRoadmapListRoadmapResponseSchema,
  ),
);

export function useInfiniteSelectorProjects(
  managedProductId: number,
  search: string,
  enabled: boolean,
) {
  const canView = useCan("build:managed-products:view");
  const filters = search ? { search } : undefined;
  return useInfiniteQuery<ManagedProductRelationsListLinkedProjectsResponse>({
    queryKey: [
      ...buildWorkQueryKeys.projects.managedProducts.linkedProjects(
        managedProductId,
        filters,
      ),
      "infinite",
    ],
    queryFn: ({ pageParam, signal }) => {
      const qp: Record<string, string> = {};
      if (search) qp["search"] = search;
      if (typeof pageParam === "string" && pageParam) qp["cursor"] = pageParam;
      return apiClient.get<ManagedProductRelationsListLinkedProjectsResponse>(
        `/build/managed-products/${managedProductId}/projects`,
        Object.keys(qp).length ? qp : undefined,
        signal,
        projectsPageC,
      );
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (last) =>
      last.pagination.hasMore ? (last.pagination.nextCursor ?? undefined) : undefined,
    enabled: canView && managedProductId > 0 && enabled,
    staleTime: 30_000,
  });
}

export function useInfiniteSelectorOpportunities(
  managedProductId: number,
  search: string,
  enabled: boolean,
) {
  const canView = useCan("build:managed-products:view");
  const filters = search ? { search } : undefined;
  return useInfiniteQuery<DiscoveryListOpportunitiesResponse>({
    queryKey: [
      ...buildWorkQueryKeys.projects.managedProducts.opportunities(
        managedProductId,
        filters,
      ),
      "infinite",
    ],
    queryFn: ({ pageParam, signal }) => {
      const qp: Record<string, string> = {};
      if (search) qp["search"] = search;
      if (typeof pageParam === "string" && pageParam) qp["cursor"] = pageParam;
      return apiClient.get<DiscoveryListOpportunitiesResponse>(
        `/build/managed-products/${managedProductId}/opportunities`,
        Object.keys(qp).length ? qp : undefined,
        signal,
        opportunitiesPageC,
      );
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (last) =>
      last.pagination.hasMore ? (last.pagination.nextCursor ?? undefined) : undefined,
    enabled: canView && managedProductId > 0 && enabled,
    staleTime: 30_000,
  });
}

export function useInfiniteSelectorRoadmapItems(
  managedProductId: number,
  search: string,
  enabled: boolean,
) {
  const canView = useCan("build:roadmap:view");
  const params: Record<string, string | number> = { managedProductId };
  if (search) params["search"] = search;
  return useInfiniteQuery<ProjectsRoadmapListRoadmapResponse>({
    queryKey: [
      ...knowledgeAndSurveysQueryKeys.roadmap.items(params),
      "infinite",
    ],
    queryFn: ({ pageParam, signal }) => {
      const qp: Record<string, string | number> = { managedProductId };
      if (search) qp["search"] = search;
      if (typeof pageParam === "string" && pageParam) qp["cursor"] = pageParam;
      return apiClient.get<ProjectsRoadmapListRoadmapResponse>(
        "/build/roadmap",
        qp,
        signal,
        roadmapPageC,
      );
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (last) =>
      last.pagination.hasMore ? (last.pagination.nextCursor ?? undefined) : undefined,
    enabled: canView && managedProductId > 0 && enabled,
    staleTime: 30_000,
  });
}
