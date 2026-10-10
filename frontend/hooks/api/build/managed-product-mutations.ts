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
const managedProductArchiveContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductsArchiveManagedProductResponseSchema,
  ),
);
const managedProductRestoreContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductsRestoreManagedProductResponseSchema,
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

function removeManagedProductFromListCache(
  cache: ManagedProductsListCache | undefined,
  id: number,
): ManagedProductsListCache | undefined {
  if (cache === undefined) return cache;
  const filterPage = (page: ManagedProductsPage): ManagedProductsPage => ({
    ...page,
    data: page.data.filter((row) => row.id !== id),
  });
  if ("pages" in cache) {
    return { ...cache, pages: cache.pages.map(filterPage) };
  }
  return filterPage(cache);
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
    onSuccess: (created) => {
      const defaultKey = buildWorkQueryKeys.projects.managedProducts.list();
      qc.setQueryData<ManagedProductsListCache>(defaultKey, (prev) => {
        if (!prev) return prev;
        if ("pages" in prev) {
          const first = prev.pages[0];
          if (!first) return prev;
          return {
            ...prev,
            pages: [{ ...first, data: [created, ...first.data] }, ...prev.pages.slice(1)],
          };
        }
        return { ...prev, data: [created, ...prev.data] };
      });
      const otherKeys = qc
        .getQueriesData<ManagedProductsListCache>({
          queryKey: buildWorkQueryKeys.projects.managedProducts.list(),
        })
        .filter(([k]) => JSON.stringify(k) !== JSON.stringify(defaultKey));
      for (const [key] of otherKeys) {
        qc.invalidateQueries({ queryKey: key, exact: true, refetchType: "none" });
      }
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.scopeDirectory.all,
        refetchType: "none",
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
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.scopeDirectory.all,
        refetchType: "none",
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
    onSuccess: (_data, managedProductId) => {
      const loadedPages = qc.getQueriesData<ManagedProductsListCache>({
        queryKey: buildWorkQueryKeys.projects.managedProducts.list(),
      });
      for (const [key, page] of loadedPages) {
        if (page === undefined) continue;
        qc.setQueryData<ManagedProductsListCache>(
          key,
          removeManagedProductFromListCache(page, managedProductId),
        );
      }
      qc.removeQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.detail(managedProductId),
        exact: true,
      });
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.scopeDirectory.all,
        refetchType: "none",
      });
    },
  });
}

export function useArchiveManagedProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", "archive"],
    mutationFn: ({ managedProductId, version }: { managedProductId: number; version: number }) =>
      apiClient.post<ManagedProduct>(
        `/build/managed-products/${managedProductId}/archive`,
        { version },
        undefined,
        managedProductArchiveContract,
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
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.scopeDirectory.all,
        refetchType: "none",
      });
    },
  });
}

export function useRestoreManagedProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", "restore"],
    mutationFn: ({ managedProductId, version }: { managedProductId: number; version: number }) =>
      apiClient.post<ManagedProduct>(
        `/build/managed-products/${managedProductId}/restore`,
        { version },
        undefined,
        managedProductRestoreContract,
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
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.scopeDirectory.all,
        refetchType: "none",
      });
    },
  });
}
