"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { DiscoveryReviewsListOutcomeReviewsResponse } from "@/contracts/build-contracts.generated";

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

type OutcomeReviewListRow =
  DiscoveryReviewsListOutcomeReviewsResponse["data"][number];

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
