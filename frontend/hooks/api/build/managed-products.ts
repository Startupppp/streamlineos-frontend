"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type {
  UseInfiniteQueryOptions,
  InfiniteData,
} from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient, isApiError } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type { ManagedProduct, ManagedProductsPage } from "@/types/projects";
import type { ManagedProductInsights } from "@/hooks/api/build/managed-products-schema";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const managedProductPageContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductsListManagedProductsResponseSchema,
  ),
);
const managedProductRowContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductsGetManagedProductResponseSchema,
  ),
);
const managedProductInsightsContractLazy = lazyContract(() =>
  import("@/hooks/api/build/managed-products-schema").then(
    (m) => m.managedProductInsightsContract,
  ),
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
    queryFn: async ({ signal }) => {
      try {
        return await apiClient.get<ManagedProductsPage>(
          "/build/managed-products",
          queryParams,
          signal,
          managedProductPageContract,
        );
      } catch (error) {
        if (!isApiError(error) || error.status !== 400) throw error;
        const {
          ownerId: _ownerId,
          sort: _sort,
          ...compatibleParams
        } = queryParams;
        return apiClient.get<ManagedProductsPage>(
          "/build/managed-products",
          compatibleParams,
          signal,
          managedProductPageContract,
        );
      }
    },
    enabled: canView,
    staleTime: 60_000,
  });
}

type InfiniteManagedProductsParams = Omit<ListManagedProductsParams, "cursor">;

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
    queryKey:
      buildWorkQueryKeys.projects.managedProducts.listInfinite(queryParams),
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
  options?: Pick<UseQueryOptions<ManagedProduct | null>, "throwOnError">,
) {
  const canView = useCan("build:managed-products:view");
  return useQuery<ManagedProduct | null>({
    queryKey:
      buildWorkQueryKeys.projects.managedProducts.detail(managedProductId),
    queryFn: async ({ signal }) => {
      try {
        return await apiClient.get<ManagedProduct>(
          `/build/managed-products/${managedProductId}`,
          undefined,
          signal,
          managedProductRowContract,
        );
      } catch (error) {
        if (!isApiError(error) || error.status !== 404) throw error;
        return null;
      }
    },
    enabled: canView && !!managedProductId,
    staleTime: 60_000,
    ...options,
  });
}

export interface ManagedProductInsightsParams {
  range?: "7d" | "30d" | "90d";
}

export function useManagedProductInsights(
  managedProductId: number,
  params?: ManagedProductInsightsParams,
) {
  const canView = useCan("build:managed-products:view");
  const queryParams: Record<string, string> = {};
  if (params?.range) queryParams["range"] = params.range;
  const hasFilters = Object.keys(queryParams).length > 0;
  return useQuery<ManagedProductInsights | null>({
    queryKey: buildWorkQueryKeys.projects.managedProducts.insights(
      managedProductId,
      hasFilters ? queryParams : undefined,
    ),
    queryFn: async ({ signal }) => {
      try {
        return await apiClient.get<ManagedProductInsights>(
          `/build/managed-products/${managedProductId}/insights`,
          hasFilters ? queryParams : undefined,
          signal,
          managedProductInsightsContractLazy,
        );
      } catch (error) {
        if (!isApiError(error) || error.status !== 404) throw error;
        return null;
      }
    },
    enabled: canView && managedProductId > 0,
    staleTime: 2 * 60_000,
  });
}

export { useCreateManagedProduct, useUpdateManagedProduct, useDeleteManagedProduct } from "./managed-product-mutations";

