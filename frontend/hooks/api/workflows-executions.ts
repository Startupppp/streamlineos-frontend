"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  WorkflowExecution,
  WorkflowCursorPage,
  ExecutionListParams,
} from "./workflows-types";

function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission for this workflow action.");
}

export function useWorkflowExecutions(workflowId: string, params?: ExecutionListParams) {
  const canView = useCan("workflows:executions:view");
  return useQuery({
    queryKey: queryKeys.workflows.executions(workflowId, params as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<WorkflowCursorPage<WorkflowExecution>>(
        `/workflows/${workflowId}/executions`,
        params as Record<string, unknown>,
      ),
    enabled: canView && workflowId.length > 0,
    staleTime: 30_000,
  });
}

export function useAllExecutions(params?: ExecutionListParams) {
  const canView = useCan("workflows:executions:view");
  return useQuery({
    queryKey: [...queryKeys.workflows.all, "all-executions", params] as const,
    queryFn: ({ signal }) =>
      apiClient.get<WorkflowCursorPage<WorkflowExecution>>(
        "/workflows/executions",
        params as Record<string, unknown>,
      ),
    staleTime: 15_000,
    refetchInterval: (query) => {
      if (!query.state.data) return false;
      const hasRunning = query.state.data.data.some(
        (e) => e.status === "running" || e.status === "waiting",
      );
      return hasRunning ? 10_000 : false;
    },
    enabled: canView,
  });
}

export function useTriggerWorkflow() {
  const qc = useQueryClient();
  const canExecute = useCan("workflows:executions:manage");
  return useMutation({
    mutationKey: ["workflows", "trigger"],
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) => {
      assertPermission(canExecute);
      return apiClient.post<WorkflowExecution>(`/workflows/${id}/trigger`, data);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.workflows.executions(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });
}

export function useCancelExecution() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:executions:manage");
  return useMutation({
    mutationKey: ["workflows", "execution", "cancel"],
    mutationFn: ({ workflowId, executionId }: { workflowId: string; executionId: string }) => {
      assertPermission(canManage);
      return apiClient.post<WorkflowExecution>(
        `/workflows/${workflowId}/executions/${executionId}/cancel`,
      );
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.workflows.executions(variables.workflowId) });
      qc.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });
}
