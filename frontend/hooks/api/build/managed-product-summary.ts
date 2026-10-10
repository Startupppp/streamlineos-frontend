"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type { ManagedProductRelationsGetManagedProductSummaryResponse } from "@/contracts/build-contracts.generated";

const managedProductSummaryContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductRelationsGetManagedProductSummaryResponseSchema,
  ),
);

export type SummaryPeriod = "30d" | "90d" | "365d" | "all";
export type ManagedProductSummary = ManagedProductRelationsGetManagedProductSummaryResponse;

export function useManagedProductSummary(managedProductId: number, period?: SummaryPeriod) {
  const canView = useCan("build:managed-products:view");
  const queryParams: Record<string, string> = {};
  if (period !== undefined) queryParams["period"] = period;
  const hasParams = Object.keys(queryParams).length > 0;
  return useQuery<ManagedProductSummary | null>({
    queryKey: buildWorkQueryKeys.projects.managedProducts.summary(
      managedProductId,
      period,
    ),
    queryFn: async ({ signal }) => {
      return apiClient.get<ManagedProductSummary>(
        `/build/managed-products/${managedProductId}/summary`,
        hasParams ? queryParams : undefined,
        signal,
        managedProductSummaryContract,
      );
    },
    enabled: canView && managedProductId > 0,
    staleTime: 2 * 60_000,
  });
}
