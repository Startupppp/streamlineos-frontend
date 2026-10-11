"use client";

import { useQuery } from "@tanstack/react-query";
import type { DiscoveryListOpportunitiesResponse } from "@/contracts/build-contracts.generated";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const opportunitiesListContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryListOpportunitiesResponseSchema,
  ),
);
const opportunityContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryGetOpportunityResponseSchema,
  ),
);
const compareContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryCompareOpportunitiesResponseSchema,
  ),
);
const traceContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryGetTraceResponseSchema,
  ),
);
const evidenceThemesContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryReviewsGetEvidenceThemesResponseSchema,
  ),
);
const outcomeReviewsContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryReviewsListOutcomeReviewsResponseSchema,
  ),
);

export interface OpportunitiesParams {
  cursor?: string;
  limit?: number;
  state?: string;
  theme?: string;
  segment?: string;
  ownerMembershipId?: string;
  evidenceAgeDays?: string;
  scoreMin?: string;
  scoreMax?: string;
  confidence?: "low" | "medium" | "high";
  search?: string;
  sort?: "score" | "updated" | "evidence";
}

export function useOpportunities(
  managedProductId: number,
  params?: OpportunitiesParams,
  options?: { enabled?: boolean },
) {
  const canView = useCan("build:managed-products:view");
  const qp: Record<string, string> = {};
  if (params?.cursor) qp["cursor"] = params.cursor;
  if (params?.limit) qp["limit"] = String(params.limit);
  if (params?.state) qp["state"] = params.state;
  if (params?.theme) qp["theme"] = params.theme;
  if (params?.segment) qp["segment"] = params.segment;
  if (params?.ownerMembershipId) qp["ownerMembershipId"] = params.ownerMembershipId;
  if (params?.evidenceAgeDays) qp["evidenceAgeDays"] = params.evidenceAgeDays;
  if (params?.scoreMin) qp["scoreMin"] = params.scoreMin;
  if (params?.scoreMax) qp["scoreMax"] = params.scoreMax;
  if (params?.confidence) qp["confidence"] = params.confidence;
  if (params?.search) qp["search"] = params.search;
  if (params?.sort) qp["sort"] = params.sort;
  const hasFilters = Object.keys(qp).length > 0;
  return useQuery<DiscoveryListOpportunitiesResponse>({
    queryKey: buildWorkQueryKeys.projects.managedProducts.opportunities(
      managedProductId,
      hasFilters ? qp : undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/build/managed-products/${managedProductId}/opportunities`,
        hasFilters ? qp : undefined,
        signal,
        opportunitiesListContract,
      ),
    enabled: canView && managedProductId > 0 && (options?.enabled ?? true),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useOpportunity(
  managedProductId: number,
  opportunityId: number,
) {
  const canView = useCan("build:managed-products:view");
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.managedProducts.opportunity(
      managedProductId,
      opportunityId,
    ),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}`,
        undefined,
        signal,
        opportunityContract,
      ),
    enabled: canView && managedProductId > 0 && opportunityId > 0,
    staleTime: 30_000,
  });
}

export function useOpportunitiesCompare(
  managedProductId: number,
  ids: readonly number[],
) {
  const canView = useCan("build:managed-products:view");
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.managedProducts.opportunitiesCompare(
      managedProductId,
      ids,
    ),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/build/managed-products/${managedProductId}/opportunities/compare`,
        { ids: ids.join(",") },
        signal,
        compareContract,
      ),
    enabled: canView && managedProductId > 0 && ids.length >= 2 && ids.length <= 5,
    staleTime: 30_000,
  });
}

export function useOpportunityTrace(
  managedProductId: number,
  opportunityId: number,
) {
  const canView = useCan("build:managed-products:view");
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.managedProducts.opportunityTrace(
      managedProductId,
      opportunityId,
    ),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}/trace`,
        undefined,
        signal,
        traceContract,
      ),
    enabled: canView && managedProductId > 0 && opportunityId > 0,
    staleTime: 30_000,
  });
}

export interface EvidenceThemesParams {
  period?: "30d" | "90d" | "365d" | "all";
}

export function useEvidenceThemes(
  managedProductId: number,
  params?: EvidenceThemesParams,
) {
  const canView = useCan("build:managed-products:view");
  const qp: Record<string, string> = {};
  if (params?.period) qp["period"] = params.period;
  const hasFilters = Object.keys(qp).length > 0;
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.managedProducts.evidenceThemes(
      managedProductId,
      hasFilters ? qp : undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/build/managed-products/${managedProductId}/evidence-themes`,
        hasFilters ? qp : undefined,
        signal,
        evidenceThemesContract,
      ),
    enabled: canView && managedProductId > 0,
    staleTime: 2 * 60_000,
  });
}

export interface OutcomeReviewsParams {
  kind?: "experiment" | "outcome_review";
  state?: string;
  opportunityId?: string;
  roadmapItemId?: string;
  goalId?: string;
  releaseId?: string;
  dueBefore?: string;
  dueAfter?: string;
}

export function useOutcomeReviews(
  managedProductId: number,
  params?: OutcomeReviewsParams,
) {
  const canView = useCan("build:managed-products:view");
  const qp: Record<string, string> = {};
  if (params?.kind) qp["kind"] = params.kind;
  if (params?.state) qp["state"] = params.state;
  if (params?.opportunityId) qp["opportunityId"] = params.opportunityId;
  if (params?.roadmapItemId) qp["roadmapItemId"] = params.roadmapItemId;
  if (params?.goalId) qp["goalId"] = params.goalId;
  if (params?.releaseId) qp["releaseId"] = params.releaseId;
  if (params?.dueBefore) qp["dueBefore"] = params.dueBefore;
  if (params?.dueAfter) qp["dueAfter"] = params.dueAfter;
  const hasFilters = Object.keys(qp).length > 0;
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.managedProducts.outcomeReviews(
      managedProductId,
      hasFilters ? qp : undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/build/managed-products/${managedProductId}/outcome-reviews`,
        hasFilters ? qp : undefined,
        signal,
        outcomeReviewsContract,
      ),
    enabled: canView && managedProductId > 0,
    staleTime: 30_000,
  });
}
