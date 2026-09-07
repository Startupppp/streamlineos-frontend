"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { lazyContract } from "@/lib/api-envelope";

const goalListLazy = lazyContract(() =>
  import("@/hooks/api/hr/goals-schema").then((m) => m.goalListContract),
);
const goalLazy = lazyContract(() =>
  import("@/hooks/api/hr/goals-schema").then((m) => m.goalContract),
);

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
  return useGatedQuery("hr:performance:view", {
    queryKey: humanResourcesQueryKeys.hr.goals(params?.userId),
    queryFn: ({ signal }) =>
      apiClient.get<HrGoal[]>(
        "/hr/performance/goals",
        params as Record<string, unknown> | undefined, signal,
        goalListLazy,
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
    }) => apiClient.post<HrGoal>("/hr/performance/goals", data, undefined, goalLazy),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.goals() }),
  });
}
