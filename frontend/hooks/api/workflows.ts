"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export type WorkflowStatus = "draft" | "published" | "disabled" | "archived";
export type ExecutionStatus = "pending" | "running" | "waiting" | "completed" | "failed" | "cancelled" | "timed_out";
export type TriggerType = "event" | "schedule" | "webhook" | "api" | "manual";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "delegated" | "expired";
export type NodeType = "trigger" | "condition" | "approval" | "action" | "delay" | "loop" | "ai_action" | "integration" | "script" | "end";

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  definitionJson?: Record<string, unknown> | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  definitionJson: Record<string, unknown>;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersionId: string;
  status: ExecutionStatus;
  triggerType: TriggerType | null;
  triggerData: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  triggeredBy: string | null;
  createdAt: string;
}

export interface WorkflowApproval {
  id: string;
  executionId: string;
  stepId: string;
  approverId: string;
  status: ApprovalStatus;
  comment: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  workflow?: { id: string; name: string };
}

export interface WorkflowSchedule {
  id: string;
  workflowId: string;
  cronExpression: string;
  timezone: string;
  isEnabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowSecret {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  definitionJson: Record<string, unknown>;
  createdAt: string;
}

export interface WorkflowVariable {
  id: string;
  key: string;
  valueType: string;
  defaultValue: unknown | null;
  workflowVersionId: string;
  createdAt: string;
  workflowId: string;
  workflowName: string;
}

export interface WorkflowAnalytics {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  pendingApprovals: number;
  executionTrend: Array<{ date: string; count: number; successCount: number }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface CreateWorkflowInput {
  name: string;
  description?: string;
}

interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  status?: WorkflowStatus;
}

interface PublishWorkflowInput {
  definitionJson: Record<string, unknown>;
}

interface WorkflowListParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  status?: WorkflowStatus;
  search?: string;
}

interface ExecutionListParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  status?: ExecutionStatus;
}

interface UpdateScheduleInput {
  cronExpression?: string;
  timezone?: string;
  isEnabled?: boolean;
}

interface CreateSecretInput {
  name: string;
  value: string;
  description?: string;
}

interface ApprovalActionInput {
  action: "approve" | "reject";
  comment?: string;
}

export function useWorkflows(params?: WorkflowListParams) {
  const canView = useCan("workflows:workflows:view");
  return useQuery({
    queryKey: queryKeys.workflows.list(params),
    queryFn: () => apiClient.get<PaginatedResponse<Workflow>>("/workflows", params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

function assertWorkflowPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission for this workflow action.");
}

export function useWorkflow(workflowId: string) {
  const canView = useCan("workflows:workflows:view");
  return useQuery({
    queryKey: queryKeys.workflows.detail(workflowId),
    queryFn: () => apiClient.get<Workflow>(`/workflows/${workflowId}`),
    enabled: canView && workflowId.length > 0,
    staleTime: 30_000,
  });
}

export function useWorkflowAnalytics() {
  const canView = useCan("workflows:analytics:view");
  return useQuery({
    queryKey: queryKeys.workflows.analytics(),
    queryFn: () => apiClient.get<WorkflowAnalytics>("/workflows/analytics"),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useWorkflowTemplates() {
  const canView = useCan("workflows:templates:view");
  return useQuery({
    queryKey: queryKeys.workflows.templates(),
    queryFn: () => apiClient.get<WorkflowTemplate[]>("/workflows/templates"),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useWorkflowExecutions(workflowId: string, params?: ExecutionListParams) {
  const canView = useCan("workflows:executions:view");
  return useQuery({
    queryKey: queryKeys.workflows.executions(workflowId, params),
    queryFn: () =>
      apiClient.get<PaginatedResponse<WorkflowExecution>>(
        `/workflows/${workflowId}/executions`,
        params,
      ),
    enabled: canView && workflowId.length > 0,
    staleTime: 30_000,
  });
}

export function usePendingApprovals() {
  const canView = useCan("workflows:approvals:view");
  return useQuery({
    queryKey: queryKeys.workflows.approvals(),
    queryFn: () => apiClient.get<WorkflowApproval[]>("/workflows/approvals/pending"),
    staleTime: 120_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    enabled: canView,
  });
}

export function useAllExecutions(params?: ExecutionListParams) {
  const canView = useCan("workflows:executions:view");
  return useQuery({
    queryKey: [...queryKeys.workflows.all, "all-executions", params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<WorkflowExecution>>("/workflows/executions", params as Record<string, unknown>),
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

export function useAllSchedules() {
  const canManage = useCan("workflows:schedules:manage");
  return useQuery({
    queryKey: [...queryKeys.workflows.all, "all-schedules"],
    queryFn: () => apiClient.get<WorkflowSchedule[]>("/workflows/schedules"),
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  const canCreate = useCan("workflows:workflows:create");
  return useMutation({
    mutationKey: ["workflows", "create"],
    mutationFn: (input: CreateWorkflowInput) => {
      assertWorkflowPermission(canCreate);
      return apiClient.post<Workflow>("/workflows", input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workflows.all }),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  const canUpdate = useCan("workflows:workflows:update");
  return useMutation({
    mutationKey: ["workflows", "update"],
    mutationFn: ({ id, ...input }: UpdateWorkflowInput & { id: string }) => {
      assertWorkflowPermission(canUpdate);
      return apiClient.patch<Workflow>(`/workflows/${id}`, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workflows.all }),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  const canDelete = useCan("workflows:workflows:delete");
  return useMutation({
    mutationKey: ["workflows", "delete"],
    mutationFn: (id: string) => {
      assertWorkflowPermission(canDelete);
      return apiClient.delete<{ success: boolean }>(`/workflows/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workflows.all }),
  });
}

export function usePublishWorkflow() {
  const qc = useQueryClient();
  const canPublish = useCan("workflows:workflows:publish");
  return useMutation({
    mutationKey: ["workflows", "publish"],
    mutationFn: ({ id, ...input }: PublishWorkflowInput & { id: string }) => {
      assertWorkflowPermission(canPublish);
      return apiClient.post<WorkflowVersion>(`/workflows/${id}/publish`, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workflows.all }),
  });
}

export function useDuplicateWorkflow() {
  const qc = useQueryClient();
  const canCreate = useCan("workflows:workflows:create");
  return useMutation({
    mutationKey: ["workflows", "duplicate"],
    mutationFn: (id: string) => {
      assertWorkflowPermission(canCreate);
      return apiClient.post<Workflow>(`/workflows/${id}/duplicate`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workflows.all }),
  });
}

export function useTriggerWorkflow() {
  const qc = useQueryClient();
  const canExecute = useCan("workflows:executions:manage");
  return useMutation({
    mutationKey: ["workflows", "trigger"],
    mutationFn: ({ id, data }: { id: string; data?: Record<string, unknown> }) => {
      assertWorkflowPermission(canExecute);
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
      assertWorkflowPermission(canManage);
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

export function useHandleApproval() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:approvals:manage");
  return useMutation({
    mutationKey: ["handle", "approval"],
    mutationFn: ({ approvalId, ...input }: ApprovalActionInput & { approvalId: string }) => {
      assertWorkflowPermission(canManage);
      return apiClient.post<WorkflowApproval>(`/workflows/approvals/${approvalId}/action`, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workflows.approvals() });
      qc.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:schedules:manage");
  return useMutation({
    mutationKey: ["update", "schedule"],
    mutationFn: ({
      workflowId,
      scheduleId,
      ...input
    }: UpdateScheduleInput & { workflowId: string; scheduleId: string }) => {
      assertWorkflowPermission(canManage);
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
  return useMutation({
    mutationKey: ["delete", "schedule"],
    mutationFn: ({
      workflowId,
      scheduleId,
    }: { workflowId: string; scheduleId: string }) => {
      assertWorkflowPermission(canManage);
      return apiClient.delete<{ success: boolean }>(
        `/workflows/${workflowId}/schedules/${scheduleId}`,
      );
    },
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: queryKeys.workflows.schedules(variables.workflowId) }),
  });
}

export function useGlobalSecrets() {
  const canManage = useCan("workflows:secrets:manage");
  return useQuery({
    queryKey: [...queryKeys.workflows.all, "global-secrets"],
    queryFn: () => apiClient.get<WorkflowSecret[]>("/workflows/secrets"),
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function useCreateGlobalSecret() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:secrets:manage");
  return useMutation({
    mutationKey: ["create", "global", "secret"],
    mutationFn: (input: CreateSecretInput) => {
      assertWorkflowPermission(canManage);
      return apiClient.post<WorkflowSecret>("/workflows/secrets", input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.workflows.all, "global-secrets"] }),
  });
}

export function useDeleteGlobalSecret() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:secrets:manage");
  return useMutation({
    mutationKey: ["delete", "global", "secret"],
    mutationFn: (secretId: string) => {
      assertWorkflowPermission(canManage);
      return apiClient.delete<{ success: boolean }>(`/workflows/secrets/${secretId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.workflows.all, "global-secrets"] }),
  });
}

export function useGlobalVariables() {
  const canManage = useCan("workflows:variables:manage");
  return useQuery({
    queryKey: [...queryKeys.workflows.all, "global-variables"],
    queryFn: () => apiClient.get<WorkflowVariable[]>("/workflows/variables"),
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function useDeleteGlobalVariable() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:variables:manage");
  return useMutation({
    mutationKey: ["delete", "global", "variable"],
    mutationFn: (variableId: string) => {
      assertWorkflowPermission(canManage);
      return apiClient.delete<{ success: boolean }>(`/workflows/variables/${variableId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.workflows.all, "global-variables"] }),
  });
}
