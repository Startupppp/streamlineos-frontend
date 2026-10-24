"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { reviewCyclesQueryOptions } from "@/hooks/api/hr/performance-read-options";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { invalidateCalendarProjectionWindows } from "@/lib/calendar-projection-cache";

const listCyclesC = lazyContract(() =>
  import("@/hooks/api/hr/performance-schema").then((m) => m.listCyclesContract),
);
const createCycleC = lazyContract(() =>
  import("@/hooks/api/hr/performance-schema").then((m) => m.createCycleContract),
);
const updateCycleC = lazyContract(() =>
  import("@/hooks/api/hr/performance-schema").then((m) => m.updateCycleContract),
);
const createReviewC = lazyContract(() =>
  import("@/hooks/api/hr/performance-schema").then((m) => m.createReviewContract),
);
const updateReviewC = lazyContract(() =>
  import("@/hooks/api/hr/performance-schema").then((m) => m.updateReviewContract),
);
const updateGoalC = lazyContract(() =>
  import("@/hooks/api/hr/performance-schema").then((m) => m.updateGoalContract),
);
const listOneOnOnesC = lazyContract(() =>
  import("@/hooks/api/hr/performance-schema").then((m) => m.listOneOnOnesContract),
);
const createOneOnOneC = lazyContract(() =>
  import("@/hooks/api/hr/performance-schema").then((m) => m.createOneOnOneContract),
);
const updateOneOnOneC = lazyContract(() =>
  import("@/hooks/api/hr/performance-schema").then((m) => m.updateOneOnOneContract),
);
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
    ...reviewCyclesQueryOptions(),
    queryFn: ({ signal }) =>
      apiClient.get<ReviewCycle[]>("/hr/performance/cycles", undefined, signal, listCyclesC),
    enabled: canView && hrEnabled,
    ...INLINE_READ_ERROR,
  });
}

export function useCreateReviewCycle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "review-cycles", "create"],
    mutationFn: (data: CreateReviewCycleInput) =>
      apiClient.post<ReviewCycle>("/hr/performance/cycles", data, undefined, createCycleC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.reviewCycles() });
      invalidateCalendarProjectionWindows(qc);
    },
  });
}

export function useUpdateReviewCycle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "review-cycles", "update"],
    mutationFn: ({ cycleId, ...data }: UpdateReviewCycleInput & { cycleId: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/performance/cycles/${cycleId}`, data, undefined, updateCycleC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.reviewCycles() });
      invalidateCalendarProjectionWindows(qc);
    },
  });
}

export function useDeleteReviewCycle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "review-cycles", "delete"],
    mutationFn: (cycleId: number) =>
      apiClient.delete<void>(`/hr/performance/cycles/${cycleId}`, undefined, undefined, noContentC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.reviewCycles() });
      invalidateCalendarProjectionWindows(qc);
    },
  });
}

export function useCreatePerformanceReview() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "reviews", "create"],
    mutationFn: (data: CreatePerformanceReviewInput) =>
      apiClient.post<PerformanceReview>("/hr/performance/reviews", data, undefined, createReviewC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.performanceReviewsAll });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.reviewCycles() });
    },
  });
}

export function useUpdatePerformanceReview() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:view", {
    mutationKey: ["hr", "performance", "reviews", "update"],
    mutationFn: ({ reviewId, ...data }: UpdatePerformanceReviewInput & { reviewId: number; periodStart?: string; periodEnd?: string; cycleId?: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/performance/reviews/${reviewId}`, data, undefined, updateReviewC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.performanceReviewsAll }),
  });
}

export function useDeletePerformanceReview() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "reviews", "delete"],
    mutationFn: (reviewId: number) =>
      apiClient.delete<void>(`/hr/performance/reviews/${reviewId}`, undefined, undefined, noContentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.performanceReviewsAll }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:view", {
    mutationKey: ["hr", "performance", "goals", "update"],
    mutationFn: ({ goalId, ...data }: { goalId: number; title?: string; description?: string; targetValue?: number; currentValue?: number; status?: string; progress?: number; startDate?: string; endDate?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/performance/goals/${goalId}`, data, undefined, updateGoalC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.goals() }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "performance", "goals", "delete"],
    mutationFn: (goalId: number) =>
      apiClient.delete<void>(`/hr/performance/goals/${goalId}`, undefined, undefined, noContentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.goals() }),
  });
}

export function useOneOnOneMeetings(params?: { upcoming?: boolean }) {
  const canView = useCan("hr:performance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.oneOnOnes(params),
    queryFn: ({ signal }) =>
      apiClient.get<OneOnOneMeeting[]>("/hr/performance/one-on-ones", params, signal, listOneOnOnesC),
    staleTime: 2 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateOneOnOne() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:view", {
    mutationKey: ["hr", "performance", "one-on-ones", "create"],
    mutationFn: (data: CreateOneOnOneInput) =>
      apiClient.post<OneOnOneMeeting>("/hr/performance/one-on-ones", data, undefined, createOneOnOneC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.oneOnOnes() }),
  });
}

export function useUpdateOneOnOne() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:view", {
    mutationKey: ["hr", "performance", "one-on-ones", "update"],
    mutationFn: ({ oneOnOneId, ...data }: UpdateOneOnOneInput & { oneOnOneId: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/performance/one-on-ones/${oneOnOneId}`, data, undefined, updateOneOnOneC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.oneOnOnes() }),
  });
}

export function useDeleteOneOnOne() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:view", {
    mutationKey: ["hr", "performance", "one-on-ones", "delete"],
    mutationFn: (oneOnOneId: number) =>
      apiClient.delete<void>(`/hr/performance/one-on-ones/${oneOnOneId}`, undefined, undefined, noContentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.oneOnOnes() }),
  });
}
