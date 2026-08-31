"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  ReviewCycle,
  PerformanceReview,
  OneOnOneMeeting,
  CreateReviewCycleInput,
  UpdateReviewCycleInput,
  CreatePerformanceReviewInput,
  UpdatePerformanceReviewInput,
  CreateOneOnOneInput,
  UpdateOneOnOneInput,
} from "@/types/hr";

export function useReviewCycles() {
  const canView = useCan("hr:performance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.reviewCycles(),
    queryFn: () => apiClient.get<ReviewCycle[]>("/hr/performance/cycles"),
    staleTime: 2 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateReviewCycle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "review-cycles", "create"],
    mutationFn: (data: CreateReviewCycleInput) =>
      apiClient.post<ReviewCycle>("/hr/performance/cycles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.reviewCycles() }),
  });
}

export function useUpdateReviewCycle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "review-cycles", "update"],
    mutationFn: ({ id, ...data }: UpdateReviewCycleInput & { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/performance/cycles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.reviewCycles() }),
  });
}

export function useDeleteReviewCycle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "review-cycles", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/performance/cycles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.reviewCycles() }),
  });
}

export function useCreatePerformanceReview() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "reviews", "create"],
    mutationFn: (data: CreatePerformanceReviewInput) =>
      apiClient.post<PerformanceReview>("/hr/performance/reviews", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.performanceReviewsAll });
      qc.invalidateQueries({ queryKey: queryKeys.hr.reviewCycles() });
    },
  });
}

export function useUpdatePerformanceReview() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "reviews", "update"],
    mutationFn: ({ id, ...data }: UpdatePerformanceReviewInput & { id: number; periodStart?: string; periodEnd?: string; cycleId?: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/performance/reviews/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.performanceReviewsAll }),
  });
}

export function useDeletePerformanceReview() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "reviews", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/performance/reviews/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.performanceReviewsAll }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "goals", "update"],
    mutationFn: ({ goalId, ...data }: { goalId: number; title?: string; description?: string; targetValue?: number; currentValue?: number; status?: string; progress?: number; startDate?: string; endDate?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/performance/goals/${goalId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.goals() }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "goals", "delete"],
    mutationFn: (goalId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/performance/goals/${goalId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.goals() }),
  });
}

export function useOneOnOneMeetings(params?: { upcoming?: boolean }) {
  const canView = useCan("hr:performance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.oneOnOnes(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<OneOnOneMeeting[]>("/hr/performance/one-on-ones", params as Record<string, unknown> | undefined),
    staleTime: 2 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateOneOnOne() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:view", {
    mutationKey: ["hr", "performance", "one-on-ones", "create"],
    mutationFn: (data: CreateOneOnOneInput) =>
      apiClient.post<OneOnOneMeeting>("/hr/performance/one-on-ones", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.oneOnOnes() }),
  });
}

export function useUpdateOneOnOne() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:view", {
    mutationKey: ["hr", "performance", "one-on-ones", "update"],
    mutationFn: ({ id, ...data }: UpdateOneOnOneInput & { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/performance/one-on-ones/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.oneOnOnes() }),
  });
}

export function useDeleteOneOnOne() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:view", {
    mutationKey: ["hr", "performance", "one-on-ones", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/performance/one-on-ones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.oneOnOnes() }),
  });
}
