"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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

const WORKFLOWS_KEY = ["streamlineos", "hr", "workflows"] as const;
const INSTANCES_KEY = ["streamlineos", "hr", "workflow-instances"] as const;
const DELEGATIONS_KEY = ["streamlineos", "hr", "workflow-delegations"] as const;

export function useHrWorkflowDefinitions(params?: { objectType?: HrWorkflowObjectType; status?: HrWorkflowStatus; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...queryKeys.hr.hrWorkflowsAll, params],
    queryFn: ({ signal }) => apiClient.get<PaginatedResult<HrWorkflowDefinition>>("/hr/workflows", params),
    staleTime: 2 * 60_000,
  });
}

export function useHrWorkflowDefinition(workflowId: number | null) {
  return useQuery({
    queryKey: [...queryKeys.hr.hrWorkflowsAll, workflowId],
    queryFn: ({ signal }) => apiClient.get<HrWorkflowDefinition>(`/hr/workflows/${workflowId}`, undefined, signal),
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
  return useMutation({
    mutationKey: ["hr", "workflows", "create"],
    mutationFn: (data: CreateWorkflowDefinitionPayload) =>
      apiClient.post<HrWorkflowDefinition>("/hr/workflows", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  });
}

export function useUpdateWorkflowDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "workflows", "update"],
    mutationFn: ({ id, ...data }: Partial<CreateWorkflowDefinitionPayload> & { id: number }) =>
      apiClient.patch<HrWorkflowDefinition>(`/hr/workflows/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  });
}

export function useActivateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "workflows", "activate"],
    mutationFn: (id: number) => apiClient.post<HrWorkflowDefinition>(`/hr/workflows/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  });
}

export function useArchiveWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "workflows", "archive"],
    mutationFn: (id: number) => apiClient.post<HrWorkflowDefinition>(`/hr/workflows/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  });
}

export function useDuplicateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "workflows", "duplicate"],
    mutationFn: (id: number) => apiClient.post<HrWorkflowDefinition>(`/hr/workflows/${id}/duplicate`),
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
  return useMutation({
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
      ),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "workflows", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/workflows/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  });
}

export function useWorkflowInbox(page = 1, limit = 50) {
  return useQuery({
    queryKey: [...queryKeys.hr.hrWorkflowInstancesAll, "inbox", page, limit],
    queryFn: ({ signal }) => apiClient.get<PaginatedResult<HrWorkflowInstance>>("/hr/workflows/instances/inbox", { page, limit }),
    staleTime: 30_000,
  });
}

export function useWorkflowActed(
  params: { cursor?: string; limit?: number } = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...queryKeys.hr.hrWorkflowInstancesAll, "acted", params],
    queryFn: ({ signal }) =>
      apiClient.get<CursorPaginatedResult<HrWorkflowInstance>>(
        "/hr/workflows/instances/acted",
        params,
      ),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useWorkflowInstanceDetail(instanceId: number | null) {
  return useQuery({
    queryKey: [...queryKeys.hr.hrWorkflowInstancesAll, "detail", instanceId],
    queryFn: ({ signal }) => apiClient.get<HrWorkflowInstance>(`/hr/workflows/instances/${instanceId}`, undefined, signal),
    enabled: instanceId !== null,
    staleTime: 30_000,
  });
}

interface ActPayload { comment?: string; attachments?: { url: string; name: string }[] }
interface RejectPayload { comment: string; attachments?: { url: string; name: string }[] }

export function useApproveInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "workflow-instances", "approve"],
    mutationFn: ({ instanceId, ...body }: ActPayload & { instanceId: number }) =>
      apiClient.post<HrWorkflowInstance>(`/hr/workflows/instances/${instanceId}/approve`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INSTANCES_KEY });
    },
  });
}

export function useRejectInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "workflow-instances", "reject"],
    mutationFn: ({ instanceId, ...body }: RejectPayload & { instanceId: number }) =>
      apiClient.post<HrWorkflowInstance>(`/hr/workflows/instances/${instanceId}/reject`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INSTANCES_KEY });
    },
  });
}

export function useMyDelegations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...queryKeys.hr.hrWorkflowDelegationsAll, "mine"],
    queryFn: ({ signal }) => apiClient.get<HrWorkflowDelegation[]>("/hr/workflows/delegations/mine", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "workflow-delegations", "create"],
    mutationFn: (data: {
      delegateUserId: string;
      objectType?: string;
      startsAt: string;
      endsAt: string;
      reason?: string;
    }) => apiClient.post<HrWorkflowDelegation>("/hr/workflows/delegations", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DELEGATIONS_KEY }),
  });
}

export function useDeleteDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "workflow-delegations", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/workflows/delegations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: DELEGATIONS_KEY }),
  });
}
