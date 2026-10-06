import { useQueryClient } from "@tanstack/react-query";
import {
  managedProductsGetManagedProductResponseSchema,
  managedProductsListManagedProductsResponseSchema,
  managedProductsGetProductInsightsResponseSchema,
  managedProductsBulkUpdateManagedProductsResponseSchema,
  type ManagedProductsGetManagedProductResponse,
  type ManagedProductsGetProductInsightsResponse,
} from "@/contracts/build-contracts.generated";
import { lazyContract } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export const managedProductRowContract = managedProductsGetManagedProductResponseSchema;
export const managedProductPageContract = managedProductsListManagedProductsResponseSchema;
export const managedProductInsightsContract = managedProductsGetProductInsightsResponseSchema;
export const managedProductBulkResultContract = managedProductsBulkUpdateManagedProductsResponseSchema;

export type ManagedProductOwner = NonNullable<ManagedProductsGetManagedProductResponse["owner"]>;
export type ManagedProductInsights = ManagedProductsGetProductInsightsResponse;

interface BulkUpdateManagedProductsInput {
  ids: number[];
  action: "update_status";
  status: "active" | "archived";
}

const managedProductBulkResultContractLazy = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductsBulkUpdateManagedProductsResponseSchema,
  ),
);

export function useBulkUpdateManagedProducts() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", "bulk"],
    mutationFn: (input: BulkUpdateManagedProductsInput) =>
      apiClient.post(
        "/build/managed-products/bulk",
        input,
        undefined,
        managedProductBulkResultContractLazy,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.list(),
      });
    },
  });
}
