"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useCan } from "@/hooks/api/access";
import type {
  Workflow,
  WorkflowVersion,
  WorkflowCursorPage,
  WorkflowListParams,
} from "./workflows-types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const workflowListContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowListContract),
);
const workflowDetailContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowDetailContract),
);
const workflowCreateContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowCreateContract),
);
const workflowUpdateContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowUpdateContract),
);
const workflowPublishContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowPublishContract),
);


interface CreateWorkflowInput {
  name: string;
  description?: string;
}

interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  status?: "draft" | "disabled" | "archived";
}

interface PublishWorkflowInput {
  definitionJson: Record<string, unknown>;
  expectedVersion?: number;
}

function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission for this workflow action.");
}

export function useWorkflows(params?: WorkflowListParams) {
  const canView = useCan("workflows:workflows:view");
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.workflows.list(params as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<WorkflowCursorPage<Workflow>>("/workflows", params as Record<string, unknown>, signal, workflowListContract),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useWorkflow(workflowId: string) {
  const canView = useCan("workflows:workflows:view");
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.workflows.detail(workflowId),
    queryFn: ({ signal }) => apiClient.get<Workflow>(`/workflows/${workflowId}`, undefined, signal, workflowDetailContract),
    enabled: canView && workflowId.length > 0,
    staleTime: 30_000,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  const canCreate = useCan("workflows:workflows:create");
  return useAuthorizedMutation("workflows:workflows:create", {
    mutationKey: ["workflows", "create"],
    mutationFn: (input: CreateWorkflowInput) => {
      assertPermission(canCreate);
      return apiClient.post<Workflow>("/workflows", input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.workflows.all }),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  const canUpdate = useCan("workflows:workflows:update");
  return useAuthorizedMutation("workflows:workflows:update", {
    mutationKey: ["workflows", "update"],
    mutationFn: ({ id, ...input }: UpdateWorkflowInput & { id: string }) => {
      assertPermission(canUpdate);
      return apiClient.patch<Workflow>(`/workflows/${id}`, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.workflows.all }),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  const canDelete = useCan("workflows:workflows:delete");
  return useAuthorizedMutation("workflows:workflows:delete", {
    mutationKey: ["workflows", "delete"],
    mutationFn: (id: string) => {
      assertPermission(canDelete);
      return apiClient.delete<{ success: boolean }>(`/workflows/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.workflows.all }),
  });
}

export function usePublishWorkflow() {
  const qc = useQueryClient();
  const canPublish = useCan("workflows:workflows:publish");
  return useAuthorizedMutation("workflows:workflows:publish", {
    mutationKey: ["workflows", "publish"],
    mutationFn: ({ id, ...input }: PublishWorkflowInput & { id: string }) => {
      assertPermission(canPublish);
      return apiClient.post<WorkflowVersion>(`/workflows/${id}/publish`, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.workflows.all }),
  });
}

export function useDuplicateWorkflow() {
  const qc = useQueryClient();
  const canCreate = useCan("workflows:workflows:create");
  return useAuthorizedMutation("workflows:workflows:create", {
    mutationKey: ["workflows", "duplicate"],
    mutationFn: (id: string) => {
      assertPermission(canCreate);
      return apiClient.post<Workflow>(`/workflows/${id}/duplicate`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.workflows.all }),
  });
}
