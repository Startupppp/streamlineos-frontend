"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";

const productUpdateRowContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductUpdateRowSchema,
  ),
);

const productUpdatesPageContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductUpdatesPageSchema,
  ),
);

interface ProductUpdateRow {
  id: number;
  orgId: string;
  managedProductId: number;
  body: string;
  version: number;
  authorMembershipId: number | null;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductUpdatesPage {
  data: ProductUpdateRow[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export function useProductUpdates(managedProductId: number, enabled = true) {
  const canView = useCan("build:managed-products:view");
  return useQuery<ProductUpdatesPage>({
    queryKey: buildWorkQueryKeys.projects.managedProducts.productUpdates(managedProductId),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/build/managed-products/${managedProductId}/updates`,
        undefined,
        signal,
        productUpdatesPageContract,
      ),
    enabled: canView && managedProductId > 0 && enabled,
    staleTime: 30_000,
  });
}

export function useCreateProductUpdate(managedProductId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["build", "managed-products", managedProductId, "product-updates", "create"],
    mutationFn: (input: { body: string }) =>
      apiClient.post<ProductUpdateRow>(
        `/build/managed-products/${managedProductId}/updates`,
        input,
        undefined,
        productUpdateRowContract,
      ),
    onSuccess: (newRow) => {
      const key = buildWorkQueryKeys.projects.managedProducts.productUpdates(managedProductId);
      qc.setQueryData<ProductUpdatesPage>(key, (old) => {
        if (!old) return old;
        return { ...old, data: [newRow, ...old.data] };
      });
    },
  });
}
