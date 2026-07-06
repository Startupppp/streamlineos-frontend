"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  WorkflowTransition,
  CreateTransitionInput,
  UpdateTransitionInput,
  UpdateWipInput,
} from "@/types/projects/workflow";

function customStateKeys(projectId: number) {
  return ["projects", projectId, "custom-states"] as const;
}

export function useWorkflowTransitions(projectId: number) {
  return useQuery<WorkflowTransition[]>({
    queryKey: queryKeys.projects.workflow.transitions(projectId),
    queryFn: () =>
      apiClient.get<WorkflowTransition[]>(`/projects/${projectId}/workflow/transitions`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateTransition(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "workflow", "transitions", "create"],
    mutationFn: (data: CreateTransitionInput) =>
      apiClient.post<WorkflowTransition>(`/projects/${projectId}/workflow/transitions`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.workflow.transitions(projectId) });
    },
  });
}

export function useUpdateTransition(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "workflow", "transitions", "update"],
    mutationFn: ({ id, ...data }: UpdateTransitionInput & { id: number }) =>
      apiClient.patch<WorkflowTransition>(
        `/projects/${projectId}/workflow/transitions/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.workflow.transitions(projectId) });
    },
  });
}

export function useDeleteTransition(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "workflow", "transitions", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete(`/projects/${projectId}/workflow/transitions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.workflow.transitions(projectId) });
    },
  });
}

export function useUpdateStatusWip(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "workflow", "wip", "update"],
    mutationFn: ({ statusId, ...data }: UpdateWipInput & { statusId: number }) =>
      apiClient.patch(`/projects/${projectId}/workflow/statuses/${statusId}/wip`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customStateKeys(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}
