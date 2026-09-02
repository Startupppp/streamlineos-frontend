"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface HrGoal {
  id: number;
  title: string;
  description?: string;
  type: string;
  status: string;
  progress: number;
  startDate: string;
  endDate: string;
  userId: string;
  orgId: string;
  parentGoalId?: number;
  targetValue?: string;
  currentValue?: string;
  unit?: string;
  createdAt: string;
}

export function useHrGoals(params?: { userId?: string }) {
  return useQuery({
    queryKey: queryKeys.hr.goals(params?.userId),
    queryFn: ({ signal }) =>
      apiClient.get<HrGoal[]>(
        "/hr/performance/goals",
        params as Record<string, unknown> | undefined, signal,
      ),
    staleTime: 60_000,
  });
}

export function useCreateHrGoal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "goals", "create"],
    mutationFn: (data: {
      title: string;
      description?: string;
      type?: string;
      startDate: string;
      endDate: string;
      userId: string;
      targetValue?: string;
      unit?: string;
    }) => apiClient.post<HrGoal>("/hr/performance/goals", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.goals() }),
  });
}
