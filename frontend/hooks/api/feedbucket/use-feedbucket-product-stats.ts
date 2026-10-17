"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  FeedbucketCustomerImpactRow,
  FeedbucketOpportunityImpactRow,
} from "@/hooks/api/feedbucket/feedbucket-schema";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const feedbucketCustomerImpactC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then(
    (m) => m.feedbucketCustomerImpactContract,
  ),
);

const feedbucketOpportunityImpactC = lazyContract(() =>
  import("@/hooks/api/feedbucket/feedbucket-schema").then(
    (m) => m.feedbucketOpportunityImpactContract,
  ),
);

export interface CustomerImpactResult {
  rows: FeedbucketCustomerImpactRow[];
}

export interface OpportunityImpactResult {
  rows: FeedbucketOpportunityImpactRow[];
}

export function useProductCustomerImpact(managedProductId: number) {
  return useGatedQuery("feedbucket:submissions:view", {
    queryKey:
      buildWorkQueryKeys.projects.managedProducts.customerImpact(managedProductId),
    queryFn: ({ signal }) =>
      apiClient.get<CustomerImpactResult>(
        `/feedbucket/managed-products/${managedProductId}/customer-impact`,
        undefined,
        signal,
        feedbucketCustomerImpactC,
      ),
    staleTime: 30_000,
    enabled: managedProductId > 0,
    ...INLINE_READ_ERROR,
  });
}

export function useProductOpportunityImpact(managedProductId: number) {
  return useGatedQuery("feedbucket:submissions:view", {
    queryKey:
      buildWorkQueryKeys.projects.managedProducts.opportunityImpact(managedProductId),
    queryFn: ({ signal }) =>
      apiClient.get<OpportunityImpactResult>(
        `/feedbucket/managed-products/${managedProductId}/opportunity-impact`,
        undefined,
        signal,
        feedbucketOpportunityImpactC,
      ),
    staleTime: 30_000,
    enabled: managedProductId > 0,
    ...INLINE_READ_ERROR,
  });
}
