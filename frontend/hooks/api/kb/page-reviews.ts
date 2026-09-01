"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

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

export function useKbPageReviews(params?: KbPageReviewsParams) {
  const canViewReviews = useCan("kb:reviews:view");
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: queryKeys.kb.pageReviews(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbPageReview[]>("/kb/page-reviews", queryParams, signal),
    staleTime: 30_000,
    enabled: canViewReviews,
  });
}

export function useApprovePageReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pageReviews", "approve"],
    mutationFn: ({ reviewId, ...body }: ApproveReviewInput & { reviewId: number }) =>
      apiClient.post<KbPageReview>(`/kb/page-reviews/${reviewId}/approve`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageReviews() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageReviewsDue() });
    },
  });
}

export function useRejectPageReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pageReviews", "reject"],
    mutationFn: ({ reviewId, ...body }: RejectReviewInput & { reviewId: number }) =>
      apiClient.post<KbPageReview>(`/kb/page-reviews/${reviewId}/reject`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageReviews() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageReviewsDue() });
    },
  });
}
