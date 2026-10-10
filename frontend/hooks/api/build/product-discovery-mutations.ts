"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const opportunityContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryGetOpportunityResponseSchema,
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
const addEvidenceContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryAddEvidenceResponseSchema,
  ),
);
const outcomeReviewContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.discoveryReviewsCreateOutcomeReviewResponseSchema,
  ),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export interface CreateOpportunityInput {
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

export interface UpdateOpportunityInput {
  title?: string;
  problem?: string | null;
  hypothesis?: string | null;
  affectedSegment?: string | null;
  theme?: string | null;
  ownerMembershipId?: number | null;
  desiredOutcome?: string | null;
  outcomeMetric?: string | null;
  outcomeUnit?: string | null;
  outcomeBaseline?: string | null;
  outcomeTarget?: string | null;
  goalId?: number | null;
  state?: string;
  version: number;
}

export function useCreateOpportunity(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "opportunities", "create"],
    mutationFn: (data: CreateOpportunityInput) =>
      apiClient.post(
        `/build/managed-products/${managedProductId}/opportunities`,
        data,
        undefined,
        opportunityContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.opportunities(managedProductId),
        exact: false,
        refetchType: "active",
      });
    },
  });
}

export function useUpdateOpportunity(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "opportunities", "update"],
    mutationFn: ({ opportunityId, ...data }: UpdateOpportunityInput & { opportunityId: number }) =>
      apiClient.patch(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}`,
        data,
        undefined,
        opportunityContract,
      ),
    onSuccess: (updated, vars) => {
      qc.setQueryData(
        buildWorkQueryKeys.projects.managedProducts.opportunity(managedProductId, vars.opportunityId),
        updated,
      );
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.opportunities(managedProductId),
        exact: false,
        refetchType: "active",
      });
    },
  });
}

export function useDeleteOpportunity(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "opportunities", "delete"],
    mutationFn: (opportunityId: number) =>
      apiClient.delete(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.opportunities(managedProductId),
        exact: false,
        refetchType: "active",
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
    mutationKey: ["projects", "managed-products", managedProductId, "opportunities", "accept"],
    mutationFn: ({ opportunityId, ...data }: AcceptOpportunityInput & { opportunityId: number }) =>
      apiClient.post(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}/accept`,
        data,
        undefined,
        acceptContract,
      ),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.opportunity(managedProductId, vars.opportunityId),
        exact: true,
        refetchType: "none",
      });
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.opportunities(managedProductId),
        exact: false,
        refetchType: "active",
      });
    },
  });
}

export function useDeclineOpportunity(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "opportunities", "decline"],
    mutationFn: ({ opportunityId, ...data }: { opportunityId: number; note: string; expectedVersion: number }) =>
      apiClient.post(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}/decline`,
        data,
        undefined,
        declineContract,
      ),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.opportunity(managedProductId, vars.opportunityId),
        exact: true,
        refetchType: "none",
      });
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.opportunities(managedProductId),
        exact: false,
        refetchType: "active",
      });
    },
  });
}

export interface ScoreOpportunityInput {
  reach: string;
  reachPeriod: "month" | "quarter" | "year";
  reachUnit: string;
  impact: 0.25 | 0.5 | 1 | 2 | 3;
  confidence: number;
  effort: number;
  effortUnit: "person_days" | "person_weeks" | "person_months";
  expectedScoreVersion: number;
}

export function useScoreOpportunity(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "opportunities", "score"],
    mutationFn: ({ opportunityId, ...data }: ScoreOpportunityInput & { opportunityId: number }) =>
      apiClient.post(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}/scores`,
        data,
        undefined,
        addScoreContract,
      ),
    onSuccess: (result, vars) => {
      qc.setQueryData(
        buildWorkQueryKeys.projects.managedProducts.opportunity(managedProductId, vars.opportunityId),
        result,
      );
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.opportunities(managedProductId),
        exact: false,
        refetchType: "active",
      });
    },
  });
}

export function useOverrideOpportunityScore(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "opportunities", "score-override"],
    mutationFn: ({ opportunityId, ...data }: { opportunityId: number; overrideScore: number; reason: string; expectedScoreVersion: number }) =>
      apiClient.post(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}/score-override`,
        data,
        undefined,
        overrideContract,
      ),
    onSuccess: (result, vars) => {
      qc.setQueryData(
        buildWorkQueryKeys.projects.managedProducts.opportunity(managedProductId, vars.opportunityId),
        result,
      );
    },
  });
}

export function useAddOpportunityEvidence(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "opportunities", "add-evidence"],
    mutationFn: ({ opportunityId, ...data }: { opportunityId: number; sourceKind: "feedbucket_submission" | "feedback_post"; sourceId: number; note?: string }) =>
      apiClient.post(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}/evidence`,
        data,
        undefined,
        addEvidenceContract,
      ),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.opportunity(managedProductId, vars.opportunityId),
        exact: true,
        refetchType: "none",
      });
    },
  });
}

export function useRemoveOpportunityEvidence(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "opportunities", "remove-evidence"],
    mutationFn: ({ opportunityId, evidenceId }: { opportunityId: number; evidenceId: number }) =>
      apiClient.delete(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}/evidence/${evidenceId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.opportunity(managedProductId, vars.opportunityId),
        exact: true,
        refetchType: "none",
      });
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
    mutationKey: ["projects", "managed-products", managedProductId, "outcome-reviews", "create"],
    mutationFn: (data: CreateOutcomeReviewInput) =>
      apiClient.post(
        `/build/managed-products/${managedProductId}/outcome-reviews`,
        data,
        undefined,
        outcomeReviewContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.outcomeReviews(managedProductId),
        exact: false,
        refetchType: "active",
      });
    },
  });
}

export function useUpdateOutcomeReview(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "outcome-reviews", "update"],
    mutationFn: ({ outcomeReviewId, ...data }: UpdateOutcomeReviewInput & { outcomeReviewId: number }) =>
      apiClient.patch(
        `/build/managed-products/${managedProductId}/outcome-reviews/${outcomeReviewId}`,
        data,
        undefined,
        outcomeReviewContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.outcomeReviews(managedProductId),
        exact: false,
        refetchType: "active",
      });
    },
  });
}

export function useDeleteOutcomeReview(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "outcome-reviews", "delete"],
    mutationFn: (outcomeReviewId: number) =>
      apiClient.delete(
        `/build/managed-products/${managedProductId}/outcome-reviews/${outcomeReviewId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.outcomeReviews(managedProductId),
        exact: false,
        refetchType: "active",
      });
    },
  });
}
