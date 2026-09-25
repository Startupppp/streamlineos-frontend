"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";

export type KbReviewType = "approval" | "freshness";
export type KbReviewStatus = "pending" | "approved" | "rejected";
export type KbReviewStatusFilter = KbReviewStatus | "overdue";

export type KbPageReview = {
  id: number;
  orgId: string;
  pageId: number;
  pageTitle: string | null;
  pageTrustState: "unverified" | "verified" | "verification_expired" | null;
  type: KbReviewType;
  status: KbReviewStatus;
  isOverdue: boolean;
  requestedById: string | null;
  requestedByMembershipId: number | null;
  reviewerId: string | null;
  reviewerMembershipId: number | null;
  requestedByName: string | null;
  reviewerName: string | null;
  dueAt: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KbPageReviewPage = {
  data: KbPageReview[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
};

export type ApproveReviewInput = {
  note?: string;
};

export type RejectReviewInput = {
  note: string;
};

export type BulkDecideReviewsInput =
  | { ids: number[]; decision: "approved"; note?: string }
  | { ids: number[]; decision: "rejected"; note: string };

export type BulkDecideResultItem = {
  id: number;
  outcome: "succeeded" | "denied" | "conflict" | "notFound";
};

export type KbPageReviewsParams = {
  status?: KbReviewStatusFilter;
  type?: KbReviewType;
  reviewer?: string;
  dueFrom?: string;
  dueTo?: string;
  spaceId?: number;
  cursor?: string;
  limit?: number;
  sortDir?: "asc" | "desc";
};

const kbPageReviewListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-reviews-schema").then(
    (m) => m.kbPageReviewListContract,
  ),
);

const kbPageReviewContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-reviews-schema").then(
    (m) => m.kbPageReviewContract,
  ),
);

const kbPageReviewBulkDecideContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-reviews-schema").then(
    (m) => m.kbPageReviewBulkDecideContract,
  ),
);

export function useKbPageReviews(params?: KbPageReviewsParams) {
  const canViewReviews = useCan("kb:reviews:view");
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageReviews(queryParams),
    queryFn: ({ signal }) =>
      apiClient.get<KbPageReviewPage>(
        "/kb/page-reviews",
        queryParams,
        signal,
        kbPageReviewListContract,
      ),
    staleTime: 30_000,
    enabled: canViewReviews,
  });
}

export function useApprovePageReview() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:reviews:manage", {
    mutationKey: ["kb", "pageReviews", "approve"],
    mutationFn: ({
      reviewId,
      ...body
    }: ApproveReviewInput & { reviewId: number }) =>
      apiClient.post<KbPageReview>(
        `/kb/page-reviews/${reviewId}/approve`,
        body,
        undefined,
        kbPageReviewContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pageReviews(),
      });
    },
  });
}

export function useRejectPageReview() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:reviews:manage", {
    mutationKey: ["kb", "pageReviews", "reject"],
    mutationFn: ({
      reviewId,
      ...body
    }: RejectReviewInput & { reviewId: number }) =>
      apiClient.post<KbPageReview>(
        `/kb/page-reviews/${reviewId}/reject`,
        body,
        undefined,
        kbPageReviewContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pageReviews(),
      });
    },
  });
}

export function useBulkDecidePageReviews() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("kb:reviews:manage", {
    mutationKey: knowledgeAndSurveysQueryKeys.kb.pageReviewsBulkDecide(),
    mutationFn: (body: BulkDecideReviewsInput) =>
      apiClient.post<{ results: BulkDecideResultItem[] }>(
        "/kb/page-reviews/bulk-decide",
        body,
        operation.configFor(body),
        kbPageReviewBulkDecideContract,
      ),
    onSuccess: () => {
      operation.settle();
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.pageReviews(),
      });
    },
  });
}
