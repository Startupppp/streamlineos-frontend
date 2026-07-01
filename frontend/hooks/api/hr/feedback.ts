"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
  return useQuery({
    queryKey: queryKeys.hr.feedbackCycles(),
    queryFn: () => apiClient.get<FeedbackCycle[]>("/hr/feedback/cycles"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateFeedbackCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "feedback", "cycles", "create"],
    mutationFn: (
      data: Omit<FeedbackCycle, "id" | "orgId" | "status" | "createdAt">,
    ) => apiClient.post<FeedbackCycle>("/hr/feedback/cycles", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.feedbackCycles() }),
  });
}

export function useFeedbackCycle(id: number) {
  return useQuery({
    queryKey: queryKeys.hr.feedbackCycle(id),
    queryFn: () => apiClient.get<FeedbackCycle>(`/hr/feedback/cycles/${id}`),
    staleTime: 2 * 60_000,
  });
}

export function useUpdateFeedbackCycleStatus() {
  const qc = useQueryClient();
  return useMutation({
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
  return useQuery({
    queryKey: queryKeys.hr.myPendingReviews(),
    queryFn: () =>
      apiClient.get<FeedbackCycleRequest[]>("/hr/feedback/my-reviews"),
    staleTime: 30_000,
  });
}

export function useSubmitFeedbackResponse() {
  const qc = useQueryClient();
  return useMutation({
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
  return useQuery({
    queryKey: queryKeys.hr.feedbackResults(subjectId),
    queryFn: () =>
      apiClient.get<FeedbackResult>(`/hr/feedback/results/${subjectId}`),
    staleTime: 2 * 60_000,
    enabled: subjectId.length > 0,
  });
}
