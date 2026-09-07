"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  HrWorkflowDefinition,
  HrWorkflowInstance,
  HrWorkflowDelegation,
  HrWorkflowObjectType,
  HrWorkflowStatus,
  HrWorkflowApproverType,
  HrWorkflowStepMode,
  CursorPaginatedResult,
  PaginatedResult,
} from "@/types/hr/workflows";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeyBase } from "@/lib/query-keys/base";
import { useGatedQuery } from "@/hooks/api/gated-query";

const WORKFLOWS_KEY = [...queryKeyBase, "hr", "workflows"] as const;
const INSTANCES_KEY = [...queryKeyBase, "hr", "workflow-instances"] as const;
const DELEGATIONS_KEY = [...queryKeyBase, "hr", "workflow-delegations"] as const;

export function useHrWorkflowDefinitions(params?: { objectType?: HrWorkflowObjectType; status?: HrWorkflowStatus; page?: number; limit?: number }) {
  return useGatedQuery("hr:workflows:view", {
    queryKey: [...humanResourcesQueryKeys.hr.hrWorkflowsAll, params],
    queryFn: ({ signal }) => apiClient.get<PaginatedResult<HrWorkflowDefinition>>("/hr/workflows", params, signal, lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowDefinitionListContract))),
    staleTime: 2 * 60_000,
  });
}

export function useHrWorkflowDefinition(workflowId: number | null) {
  return useGatedQuery("hr:workflows:view", {
    queryKey: [...humanResourcesQueryKeys.hr.hrWorkflowsAll, workflowId],
    queryFn: ({ signal }) => apiClient.get<HrWorkflowDefinition>(`/hr/workflows/${workflowId}`, undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowDefinitionWithStepsContract))),
    enabled: workflowId !== null,
    staleTime: 2 * 60_000,
  });
}

export interface CreateWorkflowDefinitionPayload {
  objectType: HrWorkflowObjectType;
  name: string;
  isDefault?: boolean;
  settings?: { rejectionCommentRequired?: boolean; allowDelegation?: boolean; allowReopen?: boolean };
  steps: {
    stepOrder: number;
    name: string;
    approverType: HrWorkflowApproverType;
    approverValue?: string;
    mode?: HrWorkflowStepMode;
    slaHours?: number;
    escalationApproverType?: HrWorkflowApproverType;
    escalationApproverValue?: string;
    condition?: { field: string; operator: string; value: unknown } | null;
  }[];
}

export function useCreateWorkflowDefinition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:workflows:manage", {
    mutationKey: ["hr", "workflows", "create"],
    mutationFn: (data: CreateWorkflowDefinitionPayload) =>
      apiClient.post<HrWorkflowDefinition>("/hr/workflows", data, undefined, lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowDefinitionWithStepsContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  });
}

export function useUpdateWorkflowDefinition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:workflows:manage", {
    mutationKey: ["hr", "workflows", "update"],
    mutationFn: ({ id, ...data }: Partial<CreateWorkflowDefinitionPayload> & { id: number }) =>
      apiClient.patch<HrWorkflowDefinition>(`/hr/workflows/${id}`, data, undefined, lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowDefinitionWithStepsContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  });
}

export function useActivateWorkflow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:workflows:manage", {
    mutationKey: ["hr", "workflows", "activate"],
    mutationFn: (id: number) => apiClient.post<HrWorkflowDefinition>(`/hr/workflows/${id}/activate`, undefined, undefined, lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowDefinitionWithStepsContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  });
}

export function useArchiveWorkflow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:workflows:manage", {
    mutationKey: ["hr", "workflows", "archive"],
    mutationFn: (id: number) => apiClient.post<HrWorkflowDefinition>(`/hr/workflows/${id}/archive`, undefined, undefined, lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowDefinitionWithStepsContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  });
}

export function useDuplicateWorkflow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:workflows:manage", {
    mutationKey: ["hr", "workflows", "duplicate"],
    mutationFn: (id: number) => apiClient.post<HrWorkflowDefinition>(`/hr/workflows/${id}/duplicate`, undefined, undefined, lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowDefinitionWithStepsContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  });
}

export type WorkflowSimulateResult = {
  workflowId: number;
  name: string;
  objectType: string;
  status: string;
  version: number;
  subjectEmployeeId: string;
  steps: Array<{
    stepOrder: number;
    name: string;
    mode: string;
    approverType: string;
    conditionPasses: boolean;
    resolvedApproverUserIds: string[];
    slaHours: number | null;
  }>;
  explanation: string;
};

export function useSimulateWorkflow() {
  return useAuthorizedMutation("hr:workflows:view", {
    mutationKey: ["hr", "workflows", "simulate"],
    mutationFn: (input: {
      workflowId: number;
      subjectEmployeeId: string;
      context?: Record<string, unknown>;
    }) =>
      apiClient.post<WorkflowSimulateResult>(
        `/hr/workflows/${input.workflowId}/simulate`,
        {
          subjectEmployeeId: input.subjectEmployeeId,
          context: input.context ?? {},
        },
        undefined,
        lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowSimulateContract)),
      ),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:workflows:manage", {
    mutationKey: ["hr", "workflows", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/workflows/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  });
}

export function useWorkflowInbox(page = 1, limit = 50) {
  return useGatedQuery("hr:workflows:approve", {
    queryKey: [...humanResourcesQueryKeys.hr.hrWorkflowInstancesAll, "inbox", page, limit],
    queryFn: ({ signal }) => apiClient.get<PaginatedResult<HrWorkflowInstance>>("/hr/workflows/instances/inbox", { page, limit }, signal, lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowInboxContract))),
    staleTime: 30_000,
  });
}

export function useWorkflowActed(
  params: { cursor?: string; limit?: number } = {},
  options?: { enabled?: boolean },
) {
  return useGatedQuery("hr:workflows:approve", {
    queryKey: [...humanResourcesQueryKeys.hr.hrWorkflowInstancesAll, "acted", params],
    queryFn: ({ signal }) =>
      apiClient.get<CursorPaginatedResult<HrWorkflowInstance>>(
        "/hr/workflows/instances/acted",
        params, signal,
        lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowInstancePagedContract)),
      ),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useWorkflowInstanceDetail(instanceId: number | null) {
  return useGatedQuery("hr:workflows:view", {
    queryKey: [...humanResourcesQueryKeys.hr.hrWorkflowInstancesAll, "detail", instanceId],
    queryFn: ({ signal }) => apiClient.get<HrWorkflowInstance>(`/hr/workflows/instances/${instanceId}`, undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowInstanceDetailContract))),
    enabled: instanceId !== null,
    staleTime: 30_000,
  });
}

interface ActPayload { comment?: string; attachments?: { url: string; name: string }[] }
interface RejectPayload { comment: string; attachments?: { url: string; name: string }[] }

export function useApproveInstance() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:workflows:approve", {
    mutationKey: ["hr", "workflow-instances", "approve"],
    mutationFn: ({ instanceId, ...body }: ActPayload & { instanceId: number }) =>
      apiClient.post<HrWorkflowInstance>(`/hr/workflows/instances/${instanceId}/approve`, body, undefined, lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowInstanceRowContract))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INSTANCES_KEY });
    },
  });
}

export function useRejectInstance() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:workflows:approve", {
    mutationKey: ["hr", "workflow-instances", "reject"],
    mutationFn: ({ instanceId, ...body }: RejectPayload & { instanceId: number }) =>
      apiClient.post<HrWorkflowInstance>(`/hr/workflows/instances/${instanceId}/reject`, body, undefined, lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowInstanceRowContract))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INSTANCES_KEY });
    },
  });
}

export function useMyDelegations(options?: { enabled?: boolean }) {
  return useGatedQuery("hr:workflows:view", {
    queryKey: [...humanResourcesQueryKeys.hr.hrWorkflowDelegationsAll, "mine"],
    queryFn: ({ signal }) => apiClient.get<HrWorkflowDelegation[]>("/hr/workflows/delegations/mine", undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowDelegationListContract))),
    staleTime: 2 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateDelegation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:workflows:view", {
    mutationKey: ["hr", "workflow-delegations", "create"],
    mutationFn: (data: {
      delegateUserId: string;
      objectType?: string;
      startsAt: string;
      endsAt: string;
      reason?: string;
    }) => apiClient.post<HrWorkflowDelegation>("/hr/workflows/delegations", data, undefined, lazyContract(() => import("@/hooks/api/hr/hr-workflows-schema").then(m => m.workflowDelegationRowSingleContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: DELEGATIONS_KEY }),
  });
}

export function useDeleteDelegation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:workflows:view", {
    mutationKey: ["hr", "workflow-delegations", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/workflows/delegations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: DELEGATIONS_KEY }),
  });
}
