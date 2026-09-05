"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useCan } from "@/hooks/api/access";
import type {
  WorkflowExecution,
  WorkflowCursorPage,
  ExecutionListParams,
  ExecutionStatus,
} from "./workflows-types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

// The runner picks up pending as well as waiting, so a queued run is still moving.
const ACTIVE_EXECUTION_STATUSES: ReadonlySet<ExecutionStatus> = new Set<ExecutionStatus>([
  "pending",
  "running",
  "waiting",
]);

export function isActiveExecution(status: ExecutionStatus): boolean {
  return ACTIVE_EXECUTION_STATUSES.has(status);
}

function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission for this workflow action.");
}

export function useWorkflowExecutions(workflowId: string, params?: ExecutionListParams) {
  const canView = useCan("workflows:executions:view");
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.workflows.executions(workflowId, params as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<WorkflowCursorPage<WorkflowExecution>>(
        `/workflows/${workflowId}/executions`,
        params as Record<string, unknown>, signal,
      ),
    enabled: canView && workflowId.length > 0,
    staleTime: 30_000,
  });
}

export function useAllExecutions(params?: ExecutionListParams) {
  const canView = useCan("workflows:executions:view");
  return useQuery({
    queryKey: [...supportAndWorkflowsQueryKeys.workflows.all, "all-executions", params] as const,
    queryFn: ({ signal }) =>
      apiClient.get<WorkflowCursorPage<WorkflowExecution>>(
        "/workflows/executions",
        params as Record<string, unknown>, signal,
      ),
    staleTime: 15_000,
    refetchInterval: (query) => {
      if (!query.state.data) return false;
      const hasActive = query.state.data.data.some((e) => isActiveExecution(e.status));
      return hasActive ? 10_000 : false;
    },
    enabled: canView,
  });
}

export function useTriggerWorkflow() {
  const qc = useQueryClient();
  const canExecute = useCan("workflows:executions:manage");
  return useAuthorizedMutation("workflows:executions:manage", {
    mutationKey: ["workflows", "trigger"],
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) => {
      assertPermission(canExecute);
      return apiClient.post<WorkflowExecution>(`/workflows/${id}/trigger`, data);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.workflows.executions(variables.id) });
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.workflows.all });
    },
  });
}

export function useCancelExecution() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:executions:manage");
  return useAuthorizedMutation("workflows:executions:manage", {
    mutationKey: ["workflows", "execution", "cancel"],
    mutationFn: ({ workflowId, executionId }: { workflowId: string; executionId: string }) => {
      assertPermission(canManage);
      return apiClient.post<WorkflowExecution>(
        `/workflows/${workflowId}/executions/${executionId}/cancel`,
      );
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.workflows.executions(variables.workflowId) });
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.workflows.all });
    },
  });
}
