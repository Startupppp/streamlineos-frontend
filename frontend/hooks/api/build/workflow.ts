"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  WorkflowTransition,
  CreateTransitionInput,
  UpdateTransitionInput,
  UpdateWipInput,
} from "@/types/projects/workflow";

function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission to manage project workflows.");
}

function customStateKeys(projectId: number) {
  return ["projects", projectId, "custom-states"] as const;
}

export function useWorkflowTransitions(projectId: number) {
  const canView = useCan("build:workflow:view");
  return useQuery<WorkflowTransition[]>({
    queryKey: queryKeys.projects.workflow.transitions(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<WorkflowTransition[]>(`/build/${projectId}/workflow/transitions`, undefined, signal),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateTransition(projectId: number) {
  const qc = useQueryClient();
  const canManage = useCan("build:workflow:manage");
  return useMutation({
    mutationKey: ["projects", projectId, "workflow", "transitions", "create"],
    mutationFn: (data: CreateTransitionInput) => {
      assertPermission(canManage);
      return apiClient.post<WorkflowTransition>(`/build/${projectId}/workflow/transitions`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.workflow.transitions(projectId) });
    },
  });
}

export function useUpdateTransition(projectId: number) {
  const qc = useQueryClient();
  const canManage = useCan("build:workflow:manage");
  return useMutation({
    mutationKey: ["projects", projectId, "workflow", "transitions", "update"],
    mutationFn: ({ id, ...data }: UpdateTransitionInput & { id: number }) => {
      assertPermission(canManage);
      return apiClient.patch<WorkflowTransition>(
        `/build/${projectId}/workflow/transitions/${id}`,
        data,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.workflow.transitions(projectId) });
    },
  });
}

export function useDeleteTransition(projectId: number) {
  const qc = useQueryClient();
  const canManage = useCan("build:workflow:manage");
  return useMutation({
    mutationKey: ["projects", projectId, "workflow", "transitions", "delete"],
    mutationFn: (id: number) => {
      assertPermission(canManage);
      return apiClient.delete(`/build/${projectId}/workflow/transitions/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.workflow.transitions(projectId) });
    },
  });
}

export function useUpdateStatusWip(projectId: number) {
  const qc = useQueryClient();
  const canManage = useCan("build:workflow:manage");
  return useMutation({
    mutationKey: ["projects", projectId, "workflow", "wip", "update"],
    mutationFn: ({ statusId, ...data }: UpdateWipInput & { statusId: number }) => {
      assertPermission(canManage);
      return apiClient.patch(`/build/${projectId}/workflow/statuses/${statusId}/wip`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customStateKeys(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}
