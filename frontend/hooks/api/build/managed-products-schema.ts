import {
  managedProductsListManagedProductsResponseSchema,
  managedProductsGetProductInsightsResponseSchema,
  type ManagedProductsGetProductInsightsResponse,
} from "@/contracts/build-contracts.generated";

export const managedProductPageContract = managedProductsListManagedProductsResponseSchema;
export const managedProductInsightsContract = managedProductsGetProductInsightsResponseSchema;

export type ManagedProductInsights = ManagedProductsGetProductInsightsResponse;
