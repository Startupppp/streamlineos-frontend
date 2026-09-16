"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface CreateFeedbackCycleInput {
  name: string;
  type?: string;
  startDate: string;
  endDate: string;
  isAnonymous?: boolean;
  questions?: { id: string; text: string; type: "rating" | "text" }[];
}

export interface FeedbackCycle {
  id: number;
  orgId: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  isAnonymous: boolean;
  questions: { id: string; text: string; type: "rating" | "text" }[];
  createdBy: string | null;
  createdAt: string;
}

export interface FeedbackCycleRequest {
  id: number;
  cycleId: number;
  subjectId: string;
  reviewerId: string;
  relationship: string;
  status: string;
  submittedAt?: string;
  createdAt: string;
}

export interface FeedbackResult {
  subjectId: string;
  totalRequests: number;
  completedRequests: number;
  avgRating?: number;
  responses: {
    requestId: number;
    overallRating?: number;
    submittedAt: string;
    responses: { questionId: string; rating?: number; text?: string }[];
  }[];
}

export function useFeedbackCycles() {
  const canView = useCan("hr:performance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.feedbackCycles(),
    queryFn: ({ signal }) => apiClient.get<FeedbackCycle[]>("/hr/feedback/cycles", undefined, signal, lazyContract(() => import("@/hooks/api/hr/feedback-schema").then(m => m.listCyclesContract))),
    staleTime: 2 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateFeedbackCycle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "feedback", "cycles", "create"],
    mutationFn: (data: CreateFeedbackCycleInput) => apiClient.post<FeedbackCycle[]>("/hr/feedback/cycles", data, undefined, lazyContract(() => import("@/hooks/api/hr/feedback-schema").then(m => m.createCycleContract))),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.feedbackCycles() }),
  });
}

export function useUpdateFeedbackCycleStatus() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "feedback", "cycles", "updateStatus"],
    mutationFn: ({ cycleId, status }: { cycleId: number; status: string }) =>
      apiClient.patch<FeedbackCycle[]>(`/hr/feedback/cycles/${cycleId}`, { status }, undefined, lazyContract(() => import("@/hooks/api/hr/feedback-schema").then(m => m.updateCycleStatusContract))),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.feedbackCycles() });
      qc.invalidateQueries({
        queryKey: humanResourcesQueryKeys.hr.feedbackCycle(variables.cycleId),
      });
    },
  });
}

export function useMyPendingReviews() {
  const canView = useCan("hr:performance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.myPendingReviews(),
    queryFn: ({ signal }) =>
      apiClient.get<FeedbackCycleRequest[]>("/hr/feedback/my-reviews", undefined, signal, lazyContract(() => import("@/hooks/api/hr/feedback-schema").then(m => m.getMyPendingReviewsContract))),
    staleTime: 30_000,
    enabled: canView && hrEnabled,
  });
}

export function useSubmitFeedbackResponse() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:view", {
    mutationKey: ["hr", "feedback", "respond"],
    mutationFn: ({
      requestId,
      responses,
      overallRating,
    }: {
      requestId: number;
      responses: { questionId: string; rating?: number; text?: string }[];
      overallRating?: number;
    }) =>
      apiClient.post<{ success: boolean }>(
        `/hr/feedback/requests/${requestId}/respond`,
        { responses, overallRating },
        undefined,
        lazyContract(() => import("@/hooks/api/hr/feedback-schema").then(m => m.successResponseContract)),
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.myPendingReviews() }),
  });
}

export function useFeedbackResults(subjectId: string) {
  const canView = useCan("hr:performance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.feedbackResults(subjectId),
    queryFn: ({ signal }) =>
      apiClient.get<FeedbackResult>(`/hr/feedback/results/${subjectId}`, undefined, signal, lazyContract(() => import("@/hooks/api/hr/feedback-schema").then(m => m.getFeedbackResultsContract))),
    staleTime: 2 * 60_000,
    enabled: subjectId.length > 0 && canView && hrEnabled,
  });
}
