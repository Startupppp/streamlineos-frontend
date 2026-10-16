"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

import type {
  ManagedProductRelationsCreateProductUpdateResponse,
  ManagedProductRelationsListProductUpdatesResponse,
} from "@/contracts/build-contracts.generated";

const productUpdateRowContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductRelationsCreateProductUpdateResponseSchema,
  ),
);

const productUpdatesPageContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductRelationsListProductUpdatesResponseSchema,
  ),
);

type ProductUpdateRow = ManagedProductRelationsCreateProductUpdateResponse;
type ProductUpdatesPage = ManagedProductRelationsListProductUpdatesResponse;

export function useProductUpdates(managedProductId: number) {
  const canView = useCan("build:managed-products:view");
  return useQuery<ProductUpdatesPage>({
    queryKey:
      buildWorkQueryKeys.projects.managedProducts.productUpdates(
        managedProductId,
      ),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/build/managed-products/${managedProductId}/updates`,
        undefined,
        signal,
        productUpdatesPageContract,
      ),
    enabled: canView && managedProductId > 0,
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useCreateProductUpdate(managedProductId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [
      "build",
      "managed-products",
      managedProductId,
      "product-updates",
      "create",
    ],
    mutationFn: (input: { body: string }) =>
      apiClient.post<ProductUpdateRow>(
        `/build/managed-products/${managedProductId}/updates`,
        input,
        undefined,
        productUpdateRowContract,
      ),
    onSuccess: (newRow) => {
      const key =
        buildWorkQueryKeys.projects.managedProducts.productUpdates(
          managedProductId,
        );
      qc.setQueryData<ProductUpdatesPage>(key, (old) => {
        if (!old) return old;
        return { ...old, data: [newRow, ...old.data] };
      });
    },
  });
}
