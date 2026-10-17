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

export type OpportunityListRow = DiscoveryListOpportunitiesResponse["data"][number];

export function getLoadedOpportunityLists(qc: QueryClient, managedProductId: number) {
  const prefix = buildWorkQueryKeys.projects.managedProducts.opportunities(managedProductId);
  return qc.getQueriesData<DiscoveryListOpportunitiesResponse>({
    queryKey: prefix,
    predicate: (query) => {
      const next = query.queryKey[prefix.length];
      return next === undefined || (typeof next === "object" && next !== null);
    },
  });
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
