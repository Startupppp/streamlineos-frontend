"use client";

import type { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import type { projectStatusContract as projectStatusContractDef } from "@/hooks/api/build/workflow-schema";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  WorkflowTransition,
  CreateTransitionInput,
  UpdateTransitionInput,
  UpdateWipInput,
} from "@/types/projects/workflow";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


const workflowTransitionListContract = lazyContract(() =>
  import("@/hooks/api/build/workflow-schema").then((m) => m.workflowTransitionListContract),
);
const workflowTransitionContract = lazyContract(() =>
  import("@/hooks/api/build/workflow-schema").then((m) => m.workflowTransitionContract),
);
const projectStatusContract = lazyContract(() =>
  import("@/hooks/api/build/workflow-schema").then((m) => m.projectStatusContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

type ProjectStatus = z.infer<typeof projectStatusContractDef>;

function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission to manage project workflows.");
}

function customStateKeys(projectId: number) {
  return ["projects", projectId, "custom-states"] as const;
}

export function useWorkflowTransitions(projectId: number) {
  const canView = useCan("build:workflow:view");
  return useQuery<WorkflowTransition[]>({
    queryKey: buildWorkQueryKeys.projects.workflow.transitions(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<WorkflowTransition[]>(`/build/${projectId}/workflow/transitions`, undefined, signal, workflowTransitionListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateTransition(projectId: number) {
  const qc = useQueryClient();
  const canManage = useCan("build:workflow:manage");
  return useAuthorizedMutation("build:workflow:manage", {
    mutationKey: ["projects", projectId, "workflow", "transitions", "create"],
    mutationFn: (data: CreateTransitionInput) => {
      assertPermission(canManage);
      return apiClient.post<WorkflowTransition>(`/build/${projectId}/workflow/transitions`, data, undefined, workflowTransitionContract);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.workflow.transitions(projectId) });
    },
  });
}

export function useUpdateTransition(projectId: number) {
  const qc = useQueryClient();
  const canManage = useCan("build:workflow:manage");
  return useAuthorizedMutation("build:workflow:manage", {
    mutationKey: ["projects", projectId, "workflow", "transitions", "update"],
    mutationFn: ({ transitionId, ...data }: UpdateTransitionInput & { transitionId: number }) => {
      assertPermission(canManage);
      return apiClient.patch<WorkflowTransition>(
        `/build/${projectId}/workflow/transitions/${transitionId}`,
        data,
        undefined,
        workflowTransitionContract,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.workflow.transitions(projectId) });
    },
  });
}

export function useDeleteTransition(projectId: number) {
  const qc = useQueryClient();
  const canManage = useCan("build:workflow:manage");
  return useAuthorizedMutation("build:workflow:manage", {
    mutationKey: ["projects", projectId, "workflow", "transitions", "delete"],
    mutationFn: (transitionId: number) => {
      assertPermission(canManage);
      return apiClient.delete<void>(
        `/build/${projectId}/workflow/transitions/${transitionId}`,
        undefined,
        undefined,
        noContentContract,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.workflow.transitions(projectId) });
    },
  });
}

export function useUpdateStatusWip(projectId: number) {
  const qc = useQueryClient();
  const canManage = useCan("build:workflow:manage");
  return useAuthorizedMutation("build:workflow:manage", {
    mutationKey: ["projects", projectId, "workflow", "wip", "update"],
    mutationFn: ({ statusId, ...data }: UpdateWipInput & { statusId: number }) => {
      assertPermission(canManage);
      return apiClient.patch<ProjectStatus>(
        `/build/${projectId}/workflow/statuses/${statusId}/wip`,
        data,
        undefined,
        projectStatusContract,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customStateKeys(projectId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.detail(projectId) });
    },
  });
}
