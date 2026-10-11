"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { addRoadmapItemToCache } from "@/hooks/api/build/roadmap";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  DiscoveryListOpportunitiesResponse,
  DiscoveryGetOpportunityResponse,
  DiscoveryReviewsListOutcomeReviewsResponse,
} from "@/contracts/build-contracts.generated";

const opportunityRowContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryCreateOpportunityResponseSchema,
  ),
);
const acceptContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryAcceptOpportunityResponseSchema,
  ),
);
const declineContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryDeclineOpportunityResponseSchema,
  ),
);
const addScoreContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryAddScoreResponseSchema,
  ),
);
const overrideContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryAddScoreOverrideResponseSchema,
  ),
);
const outcomeReviewContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryReviewsCreateOutcomeReviewResponseSchema,
  ),
);
const outcomeReviewUpdateContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryReviewsUpdateOutcomeReviewResponseSchema,
  ),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

type OpportunityListRow = DiscoveryListOpportunitiesResponse["data"][number];
type OutcomeReviewListRow =
  DiscoveryReviewsListOutcomeReviewsResponse["data"][number];

function getLoadedOpportunityLists(qc: QueryClient, managedProductId: number) {
  const prefix = buildWorkQueryKeys.projects.managedProducts.opportunities(managedProductId);
  return qc.getQueriesData<DiscoveryListOpportunitiesResponse>({
    queryKey: prefix,
    predicate: (query) => {
      const next = query.queryKey[prefix.length];
      return next === undefined || (typeof next === "object" && next !== null);
    },
  });
}

function patchOpportunityScoreInListCache(
  cache: DiscoveryListOpportunitiesResponse | undefined,
  opportunityId: number,
  latestScore: OpportunityListRow["latestScore"],
): DiscoveryListOpportunitiesResponse | undefined {
  if (cache === undefined || !Array.isArray(cache.data)) return cache;
  return {
    ...cache,
    data: cache.data.map((row) =>
      row.id === opportunityId
        ? { ...row, latestScore, scoreStatus: latestScore ? ("scored" as const) : row.scoreStatus }
        : row,
    ),
  };
}

function patchOpportunityInListCache(
  cache: DiscoveryListOpportunitiesResponse | undefined,
  updated: OpportunityListRow,
): DiscoveryListOpportunitiesResponse | undefined {
  if (cache === undefined || !Array.isArray(cache.data)) return cache;
  return {
    ...cache,
    data: cache.data.map((row) => (row.id === updated.id ? updated : row)),
  };
}

function patchOutcomeReviewInListCache(
  cache: DiscoveryReviewsListOutcomeReviewsResponse | undefined,
  updated: OutcomeReviewListRow,
): DiscoveryReviewsListOutcomeReviewsResponse | undefined {
  if (cache === undefined || !Array.isArray(cache.data)) return cache;
  return {
    ...cache,
    data: cache.data.map((row) => (row.id === updated.id ? updated : row)),
  };
}

function removeOutcomeReviewFromListCache(
  cache: DiscoveryReviewsListOutcomeReviewsResponse | undefined,
  id: number,
): DiscoveryReviewsListOutcomeReviewsResponse | undefined {
  if (cache === undefined || !Array.isArray(cache.data)) return cache;
  return { ...cache, data: cache.data.filter((row) => row.id !== id) };
}

interface CreateOpportunityInput {
  title: string;
  problem?: string;
  hypothesis?: string;
  affectedSegment?: string;
  theme?: string;
  ownerMembershipId?: number;
  desiredOutcome?: string;
  outcomeMetric?: string;
  outcomeUnit?: string;
  outcomeBaseline?: string;
  outcomeTarget?: string;
  goalId?: number;
}

export function useCreateOpportunity(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: [
      "projects",
      "managed-products",
      managedProductId,
      "opportunities",
      "create",
    ],
    mutationFn: (data: CreateOpportunityInput) =>
      apiClient.post(
        `/build/managed-products/${managedProductId}/opportunities`,
        data,
        undefined,
        opportunityRowContract,
      ),
    onSuccess: (created) => {
      const defaultKey =
        buildWorkQueryKeys.projects.managedProducts.opportunities(
          managedProductId,
        );
      qc.setQueryData<DiscoveryListOpportunitiesResponse>(
        defaultKey,
        (prev) => {
          if (!prev) return prev;
          return { ...prev, data: [created, ...prev.data] };
        },
      );
      const otherKeys = getLoadedOpportunityLists(qc, managedProductId).filter(
        ([k]) => JSON.stringify(k) !== JSON.stringify(defaultKey),
      );
      for (const [key] of otherKeys) {
        qc.invalidateQueries({
          queryKey: key,
          exact: true,
          refetchType: "none",
        });
      }
    },
  });
}

export interface UpdateOpportunityInput extends Partial<CreateOpportunityInput> {
  version: number;
  state?: OpportunityListRow["state"];
}

export function useUpdateOpportunity(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: [
      "projects",
      "managed-products",
      managedProductId,
      "opportunities",
      "update",
    ],
    mutationFn: ({
      opportunityId,
      ...data
    }: UpdateOpportunityInput & { opportunityId: number }) =>
      apiClient.patch(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}`,
        data,
        undefined,
        opportunityRowContract,
      ),
    onSuccess: (updated, vars) => {
      qc.setQueryData<DiscoveryGetOpportunityResponse>(
        buildWorkQueryKeys.projects.managedProducts.opportunity(
          managedProductId,
          vars.opportunityId,
        ),
        (prev) => (prev ? { ...prev, ...updated } : prev),
      );
      const loadedPages = getLoadedOpportunityLists(qc, managedProductId);
      for (const [key, page] of loadedPages) {
        if (page === undefined) continue;
        qc.setQueryData<DiscoveryListOpportunitiesResponse>(
          key,
          patchOpportunityInListCache(page, updated),
        );
      }
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.opportunityTrace(
          managedProductId,
          vars.opportunityId,
        ),
        exact: true,
        refetchType: "none",
      });
    },
  });
}

export interface AcceptOpportunityInput {
  horizon: "now" | "next" | "later";
  title?: string;
  projectId?: number;
  goalId?: number;
  releaseId?: number;
  epicTicketId?: number;
  isPublic?: boolean;
  dependsOnIds?: number[];
  note?: string;
  expectedVersion: number;
}

export function useAcceptOpportunity(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: [
      "projects",
      "managed-products",
      managedProductId,
      "opportunities",
      "accept",
    ],
    mutationFn: ({
      opportunityId,
      ...data
    }: AcceptOpportunityInput & { opportunityId: number }) =>
      apiClient.post(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}/accept`,
        data,
        undefined,
        acceptContract,
      ),
    onSuccess: (result, vars) => {
      qc.setQueryData<DiscoveryGetOpportunityResponse>(
        buildWorkQueryKeys.projects.managedProducts.opportunity(
          managedProductId,
          vars.opportunityId,
        ),
        (prev) => (prev ? { ...prev, ...result.opportunity } : prev),
      );
      const loadedPages = getLoadedOpportunityLists(qc, managedProductId);
      for (const [key, page] of loadedPages) {
        if (page === undefined) continue;
        qc.setQueryData<DiscoveryListOpportunitiesResponse>(
          key,
          patchOpportunityInListCache(page, result.opportunity),
        );
      }
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.opportunityTrace(
          managedProductId,
          vars.opportunityId,
        ),
        exact: true,
        refetchType: "none",
      });
      addRoadmapItemToCache(qc, result.roadmapItem);
    },
  });
}

export function useDeclineOpportunity(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: [
      "projects",
      "managed-products",
      managedProductId,
      "opportunities",
      "decline",
    ],
    mutationFn: ({
      opportunityId,
      ...data
    }: {
      opportunityId: number;
      note: string;
      expectedVersion: number;
    }) =>
      apiClient.post(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}/decline`,
        data,
        undefined,
        declineContract,
      ),
    onSuccess: (result, vars) => {
      qc.setQueryData<DiscoveryGetOpportunityResponse>(
        buildWorkQueryKeys.projects.managedProducts.opportunity(
          managedProductId,
          vars.opportunityId,
        ),
        (prev) => (prev ? { ...prev, ...result } : prev),
      );
      const loadedPages = getLoadedOpportunityLists(qc, managedProductId);
      for (const [key, page] of loadedPages) {
        if (page === undefined) continue;
        qc.setQueryData<DiscoveryListOpportunitiesResponse>(
          key,
          patchOpportunityInListCache(page, result),
        );
      }
    },
  });
}

interface ScoreOpportunityInput {
  reach: number;
  reachPeriod: "month" | "quarter" | "year";
  reachUnit?: string;
  impact: string;
  confidence: number;
  effort: number;
  effortUnit: "person_days" | "person_weeks" | "person_months";
  expectedScoreVersion: number;
}

export function useScoreOpportunity(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: [
      "projects",
      "managed-products",
      managedProductId,
      "opportunities",
      "score",
    ],
    mutationFn: ({
      opportunityId,
      ...data
    }: ScoreOpportunityInput & { opportunityId: number }) =>
      apiClient.post(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}/scores`,
        data,
        undefined,
        addScoreContract,
      ),
    onSuccess: (result, vars) => {
      qc.setQueryData<DiscoveryGetOpportunityResponse>(
        buildWorkQueryKeys.projects.managedProducts.opportunity(
          managedProductId,
          vars.opportunityId,
        ),
        (prev) =>
          prev
            ? {
                ...prev,
                latestScore: result.latestScore,
                scoreStatus: result.latestScore
                  ? ("scored" as const)
                  : prev.scoreStatus,
              }
            : prev,
      );
      const loadedPages = getLoadedOpportunityLists(qc, managedProductId);
      for (const [key, page] of loadedPages) {
        if (page === undefined) continue;
        qc.setQueryData<DiscoveryListOpportunitiesResponse>(
          key,
          patchOpportunityScoreInListCache(
            page,
            vars.opportunityId,
            result.latestScore,
          ),
        );
      }
    },
  });
}

export function useOverrideOpportunityScore(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: [
      "projects",
      "managed-products",
      managedProductId,
      "opportunities",
      "score-override",
    ],
    mutationFn: ({
      opportunityId,
      ...data
    }: {
      opportunityId: number;
      overrideScore: number;
      reason: string;
      expectedScoreVersion: number;
    }) =>
      apiClient.post(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}/score-override`,
        data,
        undefined,
        overrideContract,
      ),
    onSuccess: (result, vars) => {
      qc.setQueryData<DiscoveryGetOpportunityResponse>(
        buildWorkQueryKeys.projects.managedProducts.opportunity(
          managedProductId,
          vars.opportunityId,
        ),
        (prev) =>
          prev
            ? {
                ...prev,
                latestScore: result.latestScore,
                scoreStatus: result.latestScore
                  ? ("scored" as const)
                  : prev.scoreStatus,
              }
            : prev,
      );
      const loadedPages = getLoadedOpportunityLists(qc, managedProductId);
      for (const [key, page] of loadedPages) {
        if (page === undefined) continue;
        qc.setQueryData<DiscoveryListOpportunitiesResponse>(
          key,
          patchOpportunityScoreInListCache(
            page,
            vars.opportunityId,
            result.latestScore,
          ),
        );
      }
    },
  });
}

export interface CreateOutcomeReviewInput {
  kind: "experiment" | "outcome_review";
  title: string;
  hypothesis?: string;
  metric?: string;
  unit?: string;
  baseline?: string;
  target?: string;
  scheduledFor?: string;
  ownerMembershipId?: number;
  opportunityId?: number;
  roadmapItemId?: number;
  goalId?: number;
  releaseId?: number;
}

export interface UpdateOutcomeReviewInput {
  title?: string;
  hypothesis?: string | null;
  metric?: string | null;
  unit?: string | null;
  baseline?: string | null;
  target?: string | null;
  scheduledFor?: string | null;
  ownerMembershipId?: number | null;
  state?: string;
  actual?: string | null;
  result?: "met" | "partially_met" | "not_met" | "inconclusive" | null;
  notes?: string | null;
  version: number;
}

export function useCreateOutcomeReview(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: [
      "projects",
      "managed-products",
      managedProductId,
      "outcome-reviews",
      "create",
    ],
    mutationFn: (data: CreateOutcomeReviewInput) =>
      apiClient.post(
        `/build/managed-products/${managedProductId}/outcome-reviews`,
        data,
        undefined,
        outcomeReviewContract,
      ),
    onSuccess: (created) => {
      const defaultKey =
        buildWorkQueryKeys.projects.managedProducts.outcomeReviews(
          managedProductId,
        );
      qc.setQueryData<DiscoveryReviewsListOutcomeReviewsResponse>(
        defaultKey,
        (prev) => {
          if (!prev) return prev;
          return { ...prev, data: [created, ...prev.data] };
        },
      );
      const otherKeys = qc
        .getQueriesData<DiscoveryReviewsListOutcomeReviewsResponse>({
          queryKey:
            buildWorkQueryKeys.projects.managedProducts.outcomeReviews(
              managedProductId,
            ),
        })
        .filter(([k]) => JSON.stringify(k) !== JSON.stringify(defaultKey));
      for (const [key] of otherKeys) {
        qc.invalidateQueries({
          queryKey: key,
          exact: true,
          refetchType: "none",
        });
      }
    },
  });
}

export function useUpdateOutcomeReview(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: [
      "projects",
      "managed-products",
      managedProductId,
      "outcome-reviews",
      "update",
    ],
    mutationFn: ({
      outcomeReviewId,
      ...data
    }: UpdateOutcomeReviewInput & { outcomeReviewId: number }) =>
      apiClient.patch(
        `/build/managed-products/${managedProductId}/outcome-reviews/${outcomeReviewId}`,
        data,
        undefined,
        outcomeReviewUpdateContract,
      ),
    onSuccess: (updated) => {
      const loadedPages =
        qc.getQueriesData<DiscoveryReviewsListOutcomeReviewsResponse>({
          queryKey:
            buildWorkQueryKeys.projects.managedProducts.outcomeReviews(
              managedProductId,
            ),
        });
      for (const [key, page] of loadedPages) {
        if (page === undefined) continue;
        qc.setQueryData<DiscoveryReviewsListOutcomeReviewsResponse>(
          key,
          patchOutcomeReviewInListCache(page, updated),
        );
      }
    },
  });
}

export function useDeleteOutcomeReview(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: [
      "projects",
      "managed-products",
      managedProductId,
      "outcome-reviews",
      "delete",
    ],
    mutationFn: (outcomeReviewId: number) =>
      apiClient.delete(
        `/build/managed-products/${managedProductId}/outcome-reviews/${outcomeReviewId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: (_data, outcomeReviewId) => {
      const loadedPages =
        qc.getQueriesData<DiscoveryReviewsListOutcomeReviewsResponse>({
          queryKey:
            buildWorkQueryKeys.projects.managedProducts.outcomeReviews(
              managedProductId,
            ),
        });
      for (const [key, page] of loadedPages) {
        if (page === undefined) continue;
        qc.setQueryData<DiscoveryReviewsListOutcomeReviewsResponse>(
          key,
          removeOutcomeReviewFromListCache(page, outcomeReviewId),
        );
      }
    },
  });
}
