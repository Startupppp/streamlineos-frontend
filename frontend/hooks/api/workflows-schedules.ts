"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { WorkflowSchedule } from "./workflows-types";

interface UpdateScheduleInput {
  cronExpression?: string;
  timezone?: string;
  isEnabled?: boolean;
}

interface CreateScheduleInput {
  cronExpression: string;
  timezone?: string;
  isEnabled?: boolean;
}

function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission for this workflow action.");
}

export function useAllSchedules() {
  const canManage = useCan("workflows:schedules:manage");
  return useQuery({
    queryKey: [...queryKeys.workflows.all, "all-schedules"] as const,
    queryFn: () => apiClient.get<WorkflowSchedule[]>("/workflows/schedules"),
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function useWorkflowSchedules(workflowId: string) {
  const canManage = useCan("workflows:schedules:manage");
  return useQuery({
    queryKey: queryKeys.workflows.schedules(workflowId),
    queryFn: () => apiClient.get<WorkflowSchedule[]>(`/workflows/${workflowId}/schedules`),
    staleTime: 30_000,
    enabled: canManage && workflowId.length > 0,
  });
}

export function useCreateSchedule(workflowId: string) {
  const qc = useQueryClient();
  const canManage = useCan("workflows:schedules:manage");
  return useMutation({
    mutationKey: ["workflows", workflowId, "schedules", "create"],
    mutationFn: (input: CreateScheduleInput) => {
      assertPermission(canManage);
      return apiClient.post<WorkflowSchedule>(`/workflows/${workflowId}/schedules`, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workflows.schedules(workflowId) });
      qc.invalidateQueries({ queryKey: [...queryKeys.workflows.all, "all-schedules"] });
    },
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:schedules:manage");
  return useMutation({
    mutationKey: ["update", "schedule"],
    mutationFn: ({
      workflowId,
      scheduleId,
      ...input
    }: UpdateScheduleInput & { workflowId: string; scheduleId: string }) => {
      assertPermission(canManage);
      return apiClient.patch<WorkflowSchedule>(
        `/workflows/${workflowId}/schedules/${scheduleId}`,
        input,
      );
    },
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: queryKeys.workflows.schedules(variables.workflowId) }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:schedules:manage");
  return useMutation({
    mutationKey: ["delete", "schedule"],
    mutationFn: ({ workflowId, scheduleId }: { workflowId: string; scheduleId: string }) => {
      assertPermission(canManage);
      return apiClient.delete<{ success: boolean }>(
        `/workflows/${workflowId}/schedules/${scheduleId}`,
      );
    },
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: queryKeys.workflows.schedules(variables.workflowId) }),
  });
}
