"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  HrWorkflowDefinition,
  HrWorkflowInstance,
  HrWorkflowDelegation,
  HrWorkflowObjectType,
  HrWorkflowStatus,
  HrWorkflowInstanceStatus,
  HrWorkflowApproverType,
  HrWorkflowStepMode,
  PaginatedResult,
} from "@/types/hr/workflows";

const WORKFLOWS_KEY = ["streamlineos", "hr", "workflows"] as const;
const INSTANCES_KEY = ["streamlineos", "hr", "workflow-instances"] as const;
const DELEGATIONS_KEY = ["streamlineos", "hr", "workflow-delegations"] as const;

export function useHrWorkflowDefinitions(params?: { objectType?: HrWorkflowObjectType; status?: HrWorkflowStatus; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...WORKFLOWS_KEY, params],
    queryFn: () => apiClient.get<PaginatedResult<HrWorkflowDefinition>>("/hr/workflows", params),
    staleTime: 2 * 60_000,
  });
}

export function useHrWorkflowDefinition(workflowId: number | null) {
  return useQuery({
    queryKey: [...WORKFLOWS_KEY, workflowId],
    queryFn: () => apiClient.get<HrWorkflowDefinition>(`/hr/workflows/${workflowId}`),
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
    queryKey: [...INSTANCES_KEY, "inbox", page, limit],
    queryFn: () => apiClient.get<PaginatedResult<HrWorkflowInstance>>("/hr/workflows/instances/inbox", { page, limit }),
    staleTime: 30_000,
  });
}

export function useWorkflowActed(page = 1, limit = 50, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...INSTANCES_KEY, "acted", page, limit],
    queryFn: () => apiClient.get<PaginatedResult<HrWorkflowInstance>>("/hr/workflows/instances/acted", { page, limit }),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useWorkflowInstances(params?: { objectType?: HrWorkflowObjectType; status?: HrWorkflowInstanceStatus; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...INSTANCES_KEY, params],
    queryFn: () => apiClient.get<PaginatedResult<HrWorkflowInstance>>("/hr/workflows/instances", params),
    staleTime: 30_000,
  });
}

export function useWorkflowInstanceDetail(instanceId: number | null) {
  return useQuery({
    queryKey: [...INSTANCES_KEY, "detail", instanceId],
    queryFn: () => apiClient.get<HrWorkflowInstance>(`/hr/workflows/instances/${instanceId}`),
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

export function useCancelInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "workflow-instances", "cancel"],
    mutationFn: ({ instanceId, comment }: { instanceId: number; comment?: string }) =>
      apiClient.post<HrWorkflowInstance>(`/hr/workflows/instances/${instanceId}/cancel`, { comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: INSTANCES_KEY }),
  });
}

export function useReopenInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "workflow-instances", "reopen"],
    mutationFn: ({ instanceId, comment }: { instanceId: number; comment?: string }) =>
      apiClient.post<HrWorkflowInstance>(`/hr/workflows/instances/${instanceId}/reopen`, { comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: INSTANCES_KEY }),
  });
}

export function useCommentInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "workflow-instances", "comment"],
    mutationFn: ({ instanceId, ...body }: ActPayload & { instanceId: number }) =>
      apiClient.post<HrWorkflowInstance>(`/hr/workflows/instances/${instanceId}/comment`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: INSTANCES_KEY }),
  });
}

export function useMyDelegations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...DELEGATIONS_KEY, "mine"],
    queryFn: () => apiClient.get<HrWorkflowDelegation[]>("/hr/workflows/delegations/mine"),
    staleTime: 2 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useOrgDelegations() {
  return useQuery({
    queryKey: [...DELEGATIONS_KEY, "org"],
    queryFn: () => apiClient.get<HrWorkflowDelegation[]>("/hr/workflows/delegations"),
    staleTime: 2 * 60_000,
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

export function useUpdateDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "workflow-delegations", "update"],
    mutationFn: ({ id, ...data }: { id: number; active?: boolean; endsAt?: string; reason?: string }) =>
      apiClient.patch<HrWorkflowDelegation>(`/hr/workflows/delegations/${id}`, data),
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
