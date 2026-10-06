"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  ManagedProduct,
  ManagedProductsPage,
  CreateManagedProductInput,
  UpdateManagedProductInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const managedProductRowContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductsGetManagedProductResponseSchema,
  ),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

type ManagedProductsListCache = ManagedProductsPage | InfiniteData<ManagedProductsPage>;

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

export function useCreateManagedProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:create", {
    mutationKey: ["projects", "managed-products", "create"],
    mutationFn: (data: CreateManagedProductInput) =>
      apiClient.post<ManagedProduct>(
        "/build/managed-products",
        data,
        undefined,
        managedProductRowContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.list(),
      });
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.scopeDirectory.all,
      });
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
        buildWorkQueryKeys.projects.managedProducts.detail(
          vars.managedProductId,
        ),
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
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.scopeDirectory.all,
      });
    },
  });
}

export function useDeleteManagedProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:delete", {
    mutationKey: ["projects", "managed-products", "delete"],
    mutationFn: (managedProductId: number) =>
      apiClient.delete<void>(
        `/build/managed-products/${managedProductId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.list(),
      });
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.scopeDirectory.all,
      });
    },
  });
}
