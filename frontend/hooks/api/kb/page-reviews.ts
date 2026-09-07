"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type KbReviewType = "approval" | "freshness";
export type KbReviewStatus = "pending" | "approved" | "rejected";

export type KbPageReview = {
  id: number;
  orgId: string;
  pageId: number;
  pageTitle: string;
  type: KbReviewType;
  status: KbReviewStatus;
  requestedById: string;
  requestedByName: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  dueAt: string | null;
  note: string | null;
  resolvedNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApproveReviewInput = {
  note?: string;
};

export type RejectReviewInput = {
  note: string;
};

export type KbPageReviewsParams = {
  status?: string;
  type?: string;
};

const kbPageReviewListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-reviews-schema").then((m) => m.kbPageReviewListContract),
);

const kbPageReviewContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-reviews-schema").then((m) => m.kbPageReviewContract),
);

export function useKbPageReviews(params?: KbPageReviewsParams) {
  const canViewReviews = useCan("kb:reviews:view");
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageReviews(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbPageReview[]>("/kb/page-reviews", queryParams, signal, kbPageReviewListContract),
    staleTime: 30_000,
    enabled: canViewReviews,
  });
}

export function useApprovePageReview() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:reviews:manage", {
    mutationKey: ["kb", "pageReviews", "approve"],
    mutationFn: ({ reviewId, ...body }: ApproveReviewInput & { reviewId: number }) =>
      apiClient.post<KbPageReview>(`/kb/page-reviews/${reviewId}/approve`, body, undefined, kbPageReviewContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageReviews() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageReviewsDue() });
    },
  });
}

export function useRejectPageReview() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:reviews:manage", {
    mutationKey: ["kb", "pageReviews", "reject"],
    mutationFn: ({ reviewId, ...body }: RejectReviewInput & { reviewId: number }) =>
      apiClient.post<KbPageReview>(`/kb/page-reviews/${reviewId}/reject`, body, undefined, kbPageReviewContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageReviews() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageReviewsDue() });
    },
  });
}
