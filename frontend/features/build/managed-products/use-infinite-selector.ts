"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { releaseBaseKey } from "@/hooks/api/build/releases";
import type { BuildMembersResponse } from "@/hooks/api/build/build-members";
import type { GoalListItem } from "@/hooks/api/goals";
import type {
  ManagedProductRelationsListLinkedProjectsResponse,
  DiscoveryListOpportunitiesResponse,
  ProjectsRoadmapListRoadmapResponse,
  ProjectsReleasesListReleasesResponse,
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
const releasesPageC = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.projectsReleasesListReleasesResponseSchema,
  ),
);
const candidatesPageContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.buildMemberPageContract),
);
const goalsPageContract = lazyContract(() =>
  import("@/hooks/api/goals-schema").then((m) => m.goalsListContract),
);

const INITIAL_GOALS_PAGE: number = 1;

interface MemberCandidatesParams {
  search?: string;
  enabled?: boolean;
}

interface GoalCandidatesParams {
  search?: string;
  enabled?: boolean;
}

interface GoalsPage {
  items: GoalListItem[];
  page: number;
  pageSize: number;
  total: number;
}

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

export function useInfiniteSelectorProjectReleases(
  projectId: number | null,
  search: string,
  enabled: boolean,
) {
  const canView = useCan("build:view");
  const hasProject = projectId !== null && projectId > 0;
  return useInfiniteQuery<ProjectsReleasesListReleasesResponse>({
    queryKey: [...releaseBaseKey(projectId ?? 0), "infinite", search],
    queryFn: ({ pageParam, signal }) => {
      const qp: Record<string, string> = {};
      if (search) qp["q"] = search;
      if (typeof pageParam === "string" && pageParam) qp["cursor"] = pageParam;
      return apiClient.get<ProjectsReleasesListReleasesResponse>(
        `/build/${projectId}/releases`,
        Object.keys(qp).length ? qp : undefined,
        signal,
        releasesPageC,
      );
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (last) =>
      last.pagination.hasMore ? (last.pagination.nextCursor ?? undefined) : undefined,
    enabled: canView && hasProject && enabled,
    staleTime: 30_000,
  });
}

export function useAddProductMemberCandidates({
  search,
  enabled = true,
}: MemberCandidatesParams) {
  const canView = useCan("build:members:view");
  return useInfiniteQuery({
    queryKey: [
      ...buildWorkQueryKeys.projects.buildMembers.list({ search }),
      "dialog-candidates",
    ],
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<BuildMembersResponse>(
        "/build/members",
        {
          ...(pageParam ? { cursor: pageParam } : {}),
          ...(search ? { search } : {}),
        },
        signal,
        candidatesPageContract,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore && lastPage.pagination.nextCursor
        ? lastPage.pagination.nextCursor
        : undefined,
    initialPageParam: NO_CURSOR_YET,
    staleTime: 30_000,
    enabled: canView && enabled,
  });
}

export function useLinkGoalCandidates({ search, enabled = true }: GoalCandidatesParams) {
  const canView = useCan("build:goals:view");
  return useInfiniteQuery({
    queryKey: [
      ...accountingAndSupportQueryKeys.goals.list({ search }),
      "dialog-candidates",
    ],
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<GoalsPage>(
        "/goals",
        {
          ...(search ? { search } : {}),
          page: pageParam,
        },
        signal,
        goalsPageContract,
      ),
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: INITIAL_GOALS_PAGE,
    staleTime: 30_000,
    enabled: canView && enabled,
  });
}
