"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { InfiniteData, QueryClient, UseQueryOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type {
  ManagedProductRelationsListReleasesResponse,
  ManagedProductRelationsCreateReleaseResponse,
  ManagedProductRelationsUpdateReleaseResponse,
} from "@/contracts/build-contracts.generated";

export type ManagedProductRelease = ManagedProductRelationsCreateReleaseResponse & {
  allowedActions: string[];
  linkedRoadmapItemCount: number;
};
export type ManagedProductReleasesPage = ManagedProductRelationsListReleasesResponse;

export interface CreateManagedProductReleaseInput {
  name: string;
  version: string;
  description?: string | null;
  releaseDate?: string | null;
  status?: "draft" | "released" | "archived";
  ownerUserId?: string | null;
  qaState?: string | null;
  deploymentEvidenceUrl?: string | null;
}

export interface UpdateManagedProductReleaseInput {
  releaseId: number;
  expectedRevision: number;
  name?: string;
  version?: string;
  description?: string | null;
  releaseDate?: string | null;
  status?: "draft" | "released" | "archived";
  ownerUserId?: string | null;
  qaState?: string | null;
  deploymentEvidenceUrl?: string | null;
}

export interface InfiniteManagedProductReleasesParams {
  limit: number;
}

const releasesPageContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductRelationsListReleasesResponseSchema,
  ),
);

const releaseRowContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductRelationsCreateReleaseResponseSchema,
  ),
);

const releaseUpdateContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductRelationsUpdateReleaseResponseSchema,
  ),
);

function patchReleaseCaches(
  qc: QueryClient,
  managedProductId: number,
  patchPage: (page: ManagedProductReleasesPage, index: number) => ManagedProductReleasesPage,
) {
  qc.setQueryData<ManagedProductReleasesPage>(
    buildWorkQueryKeys.projects.managedProducts.releases(managedProductId),
    (prev) => (prev ? patchPage(prev, 0) : prev),
  );
  qc.setQueriesData<InfiniteData<ManagedProductReleasesPage>>(
    { queryKey: buildWorkQueryKeys.projects.managedProducts.releasesTimeline(managedProductId) },
    (prev) => (prev ? { ...prev, pages: prev.pages.map(patchPage) } : prev),
  );
}

export function useManagedProductReleases(
  managedProductId: number,
  options?: Pick<UseQueryOptions<ManagedProductReleasesPage>, "enabled">,
) {
  const canView = useCan("build:managed-products:view");
  return useQuery<ManagedProductReleasesPage>({
    queryKey: buildWorkQueryKeys.projects.managedProducts.releases(managedProductId),
    queryFn: ({ signal }) =>
      apiClient.get<ManagedProductReleasesPage>(
        `/build/managed-products/${managedProductId}/releases`,
        undefined,
        signal,
        releasesPageContract,
      ),
    enabled: canView && managedProductId > 0 && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useInfiniteManagedProductReleases(
  managedProductId: number,
  params: InfiniteManagedProductReleasesParams,
) {
  const canView = useCan("build:managed-products:view");
  return useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.managedProducts.releasesTimeline(managedProductId, {
      limit: params.limit,
    }),
    queryFn: ({ pageParam, signal }) => {
      const query: Record<string, string> = { limit: String(params.limit) };
      if (pageParam !== undefined) query.cursor = pageParam;
      return apiClient.get<ManagedProductReleasesPage>(
        `/build/managed-products/${managedProductId}/releases`,
        query,
        signal,
        releasesPageContract,
      );
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (last) => (last.pagination.hasMore ? (last.pagination.nextCursor ?? undefined) : undefined),
    enabled: canView && managedProductId > 0,
    staleTime: 30_000,
  });
}

export function useCreateManagedProductRelease(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "releases", "create"],
    mutationFn: (data: CreateManagedProductReleaseInput) =>
      apiClient.post<ManagedProductRelease>(
        `/build/managed-products/${managedProductId}/releases`,
        data,
        undefined,
        releaseRowContract,
      ),
    onSuccess: (created) => {
      qc.setQueryData<ManagedProductReleasesPage>(
        buildWorkQueryKeys.projects.managedProducts.releases(managedProductId),
        (prev) => prev ?? { data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } },
      );
      patchReleaseCaches(qc, managedProductId, (page, index) =>
        index === 0 ? { ...page, data: [created, ...page.data] } : page,
      );
    },
  });
}

export function useUpdateManagedProductRelease(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "releases", "update"],
    mutationFn: ({ releaseId, ...data }: UpdateManagedProductReleaseInput) =>
      apiClient.patch<ManagedProductReleasesPage["data"][number]>(
        `/build/managed-products/${managedProductId}/releases/${releaseId}`,
        data,
        undefined,
        releaseUpdateContract,
      ),
    onSuccess: (
      updated: ManagedProductRelationsUpdateReleaseResponse,
    ) => {
      patchReleaseCaches(qc, managedProductId, (page) => ({
        ...page,
        data: page.data.map((r) => (r.id === updated.id ? updated : r)),
      }));
    },
  });
}
