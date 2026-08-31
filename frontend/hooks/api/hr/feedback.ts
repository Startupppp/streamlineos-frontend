"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
  createdBy?: string;
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
    queryKey: queryKeys.hr.feedbackCycles(),
    queryFn: () => apiClient.get<FeedbackCycle[]>("/hr/feedback/cycles"),
    staleTime: 2 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateFeedbackCycle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "feedback", "cycles", "create"],
    mutationFn: (
      data: Omit<FeedbackCycle, "id" | "orgId" | "status" | "createdAt">,
    ) => apiClient.post<FeedbackCycle>("/hr/feedback/cycles", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.feedbackCycles() }),
  });
}

export function useUpdateFeedbackCycleStatus() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "feedback", "cycles", "updateStatus"],
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiClient.patch<FeedbackCycle>(`/hr/feedback/cycles/${id}`, { status }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.feedbackCycles() });
      qc.invalidateQueries({
        queryKey: queryKeys.hr.feedbackCycle(variables.id),
      });
    },
  });
}

export function useMyPendingReviews() {
  const canView = useCan("hr:performance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.myPendingReviews(),
    queryFn: () =>
      apiClient.get<FeedbackCycleRequest[]>("/hr/feedback/my-reviews"),
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
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.myPendingReviews() }),
  });
}

export function useFeedbackResults(subjectId: string) {
  const canView = useCan("hr:performance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.feedbackResults(subjectId),
    queryFn: () =>
      apiClient.get<FeedbackResult>(`/hr/feedback/results/${subjectId}`),
    staleTime: 2 * 60_000,
    enabled: subjectId.length > 0 && canView && hrEnabled,
  });
}
