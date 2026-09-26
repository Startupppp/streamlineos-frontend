"use client";

import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { UseInfiniteQueryOptions, InfiniteData } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type {
  ManagedProduct,
  ManagedProductsPage,
  CreateManagedProductInput,
  UpdateManagedProductInput,
} from "@/types/projects";
import type { ManagedProductInsights } from "@/hooks/api/build/managed-products-schema";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";


const managedProductPageContract = lazyContract(() =>
  import("@/hooks/api/build/managed-products-schema").then((m) => m.managedProductPageContract),
);
const managedProductRowContract = lazyContract(() =>
  import("@/hooks/api/build/managed-products-schema").then((m) => m.managedProductRowContract),
);
const managedProductInsightsContractLazy = lazyContract(() =>
  import("@/hooks/api/build/managed-products-schema").then((m) => m.managedProductInsightsContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

interface ListManagedProductsParams {
  limit?: number;
  cursor?: string;
  status?: string;
  search?: string;
  ownerId?: string;
  sort?: "name" | "updated" | "status";
}

export function useManagedProducts(params?: ListManagedProductsParams) {
  const canView = useCan("build:managed-products:view");
  const queryParams: Record<string, string> = {};

  if (params?.cursor) queryParams["cursor"] = params.cursor;
  if (params?.status) queryParams["status"] = params.status;
  if (params?.search) queryParams["search"] = params.search;
  if (params?.limit) queryParams["limit"] = String(params.limit);
  if (params?.ownerId) queryParams["ownerId"] = params.ownerId;
  if (params?.sort) queryParams["sort"] = params.sort;

  return useQuery<ManagedProductsPage>({
    queryKey: buildWorkQueryKeys.projects.managedProducts.list(
      Object.keys(queryParams).length > 0 ? queryParams : undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<ManagedProductsPage>("/build/managed-products", queryParams, signal, managedProductPageContract),
    enabled: canView,
    staleTime: 60_000,
  });
}

type InfiniteManagedProductsParams = Omit<ListManagedProductsParams, "cursor">;
type ManagedProductsListCache =
  | ManagedProductsPage
  | InfiniteData<ManagedProductsPage>;

function patchManagedProductListCache(
  cache: ManagedProductsListCache | undefined,
  updated: ManagedProduct,
): ManagedProductsListCache | undefined {
  if (cache === undefined) return cache;
  const patchPage = (page: ManagedProductsPage): ManagedProductsPage => ({
    ...page,
    data: page.data.map((row) => (row.id === updated.id ? updated : row)),
  });
  if ("pages" in cache) {
    return { ...cache, pages: cache.pages.map(patchPage) };
  }
  return patchPage(cache);
}

export function useInfiniteManagedProducts(
  params: InfiniteManagedProductsParams,
  options?: Omit<
    UseInfiniteQueryOptions<
      ManagedProductsPage,
      Error,
      InfiniteData<ManagedProductsPage>,
      readonly unknown[],
      string | undefined
    >,
    "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
  >,
) {
  const canView = useCan("build:managed-products:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  const queryParams: Record<string, string> = {};
  if (params.status) queryParams["status"] = params.status;
  if (params.search) queryParams["search"] = params.search;
  if (params.limit) queryParams["limit"] = String(params.limit);
  if (params.ownerId) queryParams["ownerId"] = params.ownerId;
  if (params.sort) queryParams["sort"] = params.sort;

  return useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.managedProducts.listInfinite(queryParams),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<ManagedProductsPage>(
        "/build/managed-products",
        {
          ...queryParams,
          ...(pageParam !== undefined ? { cursor: pageParam } : {}),
        },
        signal,
        managedProductPageContract,
      ),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage: ManagedProductsPage) =>
      lastPage.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
    ...restOptions,
    enabled: canView && (enabledOption ?? true),
  });
}

export function useManagedProduct(
  managedProductId: number,
  options?: Pick<UseQueryOptions<ManagedProduct>, "throwOnError">,
) {
  const canView = useCan("build:managed-products:view");
  return useQuery<ManagedProduct>({
    queryKey: buildWorkQueryKeys.projects.managedProducts.detail(managedProductId),
    queryFn: ({ signal }) =>
      apiClient.get<ManagedProduct>(`/build/managed-products/${managedProductId}`, undefined, signal, managedProductRowContract),
    enabled: canView && !!managedProductId,
    staleTime: 60_000,
    ...options,
  });
}

export function useManagedProductInsights(managedProductId: number) {
  const canView = useCan("build:managed-products:view");
  return useQuery<ManagedProductInsights>({
    queryKey: buildWorkQueryKeys.projects.managedProducts.insights(managedProductId),
    queryFn: ({ signal }) =>
      apiClient.get<ManagedProductInsights>(
        `/build/managed-products/${managedProductId}/insights`,
        undefined,
        signal,
        managedProductInsightsContractLazy,
      ),
    enabled: canView && managedProductId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateManagedProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:create", {
    mutationKey: ["projects", "managed-products", "create"],
    mutationFn: (data: CreateManagedProductInput) =>
      apiClient.post<ManagedProduct>("/build/managed-products", data, undefined, managedProductRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.managedProducts.list() });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.scopeDirectory.all });
    },
  });
}

export function useUpdateManagedProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", "update"],
    mutationFn: ({
      managedProductId,
      ...data
    }: UpdateManagedProductInput & { managedProductId: number }) =>
      apiClient.patch<ManagedProduct>(
        `/build/managed-products/${managedProductId}`,
        data,
        undefined,
        managedProductRowContract,
      ),
    onSuccess: (updated, vars) => {
      qc.setQueryData(
        buildWorkQueryKeys.projects.managedProducts.detail(vars.managedProductId),
        updated,
      );
      const loadedPages = qc.getQueriesData<ManagedProductsListCache>({
        queryKey: buildWorkQueryKeys.projects.managedProducts.list(),
      });
      for (const [key, page] of loadedPages) {
        if (page === undefined) continue;
        qc.setQueryData<ManagedProductsListCache>(
          key,
          patchManagedProductListCache(page, updated),
        );
      }
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.scopeDirectory.all });
    },
  });
}

export function useDeleteManagedProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:delete", {
    mutationKey: ["projects", "managed-products", "delete"],
    mutationFn: (managedProductId: number) =>
      apiClient.delete<void>(`/build/managed-products/${managedProductId}`, undefined, undefined, noContentContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.managedProducts.list() });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.scopeDirectory.all });
    },
  });
}
