"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { WorkflowSchedule, WorkflowCursorPage } from "./workflows-types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface UpdateScheduleInput {
  cronExpression?: string;
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
    queryFn: ({ signal }) =>
      apiClient.get<WorkflowCursorPage<WorkflowSchedule>>("/workflows/schedules", undefined, signal),
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:schedules:manage");
  return useAuthorizedMutation("workflows:schedules:manage", {
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
  return useAuthorizedMutation("workflows:schedules:manage", {
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
