"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  getLoadedOpportunityLists,
  type OpportunityListRow,
} from "@/hooks/api/build/opportunity-mutations";
import type {
  DiscoveryListOpportunitiesResponse,
  DiscoveryGetOpportunityResponse,
} from "@/contracts/build-contracts.generated";

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
