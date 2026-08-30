"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission to manage automations.");
}

export type AutomationTrigger =
  | "lead.created"
  | "deal.stage_changed"
  | "ticket.created"
  | "ticket.priority_changed"
  | "ticket.message_received"
  | "invoice.overdue"
  | "candidate.application_created"
  | "candidate.stage_changed"
  | "interview.scheduled"
  | "interview.completed"
  | "scorecard.submitted"
  | "offer.sent"
  | "offer.accepted"
  | "offer.rejected"
  | "candidate.bgv_status_changed"
  | "sla.breached"
  | "onboarding.started"
  | "onboarding.task_overdue"
  | "onboarding.document_submitted"
  | "onboarding.completed"
  | "leave.requested"
  | "leave.approved"
  | "leave.rejected"
  | "attendance.anomaly"
  | "resignation.submitted"
  | "resignation.approved"
  | "employee.terminated"
  | "certification.expiring"
  | "document.review_requested"
  | "performance.review_cycle_started"
  | "expense.submitted"
  | "reimbursement.approved"
  | "reimbursement.rejected";

export type AutomationConditionOp = "eq" | "neq" | "contains" | "gt" | "lt" | "exists";

export interface AutomationCondition {
  field: string;
  op: AutomationConditionOp;
  value?: string | number | boolean;
}

export type AutomationAction =
  | { type: "notify_roles"; config: { roles: string[]; title: string; message: string; link?: string } }
  | { type: "notify_all"; config: { title: string; message: string; link?: string } }
  | { type: "email"; config: { to: string; subject: string; body: string } }
  | { type: "create_task"; config: { title: string; assigneeId?: string; dueInDays?: number } }
  | { type: "webhook"; config: { event: string } }
  | { type: "support_assign_ticket"; config: { assigneeId: string } }
  | { type: "support_set_priority"; config: { priority: string } }
  | { type: "support_add_tag"; config: { tagId: number } }
  | { type: "support_internal_note"; config: { body: string } };

export type AutomationActionType = AutomationAction["type"];

export interface AutomationRule {
  id: number;
  name: string;
  description: string | null;
  triggerEvent: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isEnabled: boolean;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AutomationRunStatus = "success" | "failed" | "skipped";

interface AutomationRun {
  id: number;
  triggerEvent: string;
  status: AutomationRunStatus;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
}

interface AutomationActionResult {
  type: AutomationActionType;
  ok: boolean;
  error?: string;
}

export interface AutomationTestResult {
  runId: number;
  matched: boolean;
  status: AutomationRunStatus;
  actionResults: AutomationActionResult[];
}

interface CreateAutomationInput {
  name: string;
  description?: string;
  triggerEvent: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isEnabled: boolean;
}

interface UpdateAutomationInput {
  name?: string;
  description?: string | null;
  triggerEvent?: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions?: AutomationAction[];
  isEnabled?: boolean;
}

export interface PaginatedAutomations {
  data: AutomationRule[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface AutomationListParams {
  page?: number;
  limit?: number;
}

export function useAutomations(params?: AutomationListParams) {
  const canView = useCan("settings:automations:view");
  return useQuery({
    queryKey: [...queryKeys.automations.all, "list", params] as const,
    queryFn: () => {
      const search = new URLSearchParams();
      if (params?.page) search.set("page", String(params.page));
      if (params?.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      return apiClient.get<PaginatedAutomations>(`/settings/automations${qs ? `?${qs}` : ""}`);
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useAutomationRuns(ruleId: number) {
  const canView = useCan("settings:automations:view");
  return useQuery({
    queryKey: queryKeys.automations.runs(ruleId),
    queryFn: () => apiClient.get<AutomationRun[]>(`/settings/automations/${ruleId}/runs`),
    enabled: canView && Number.isFinite(ruleId) && ruleId > 0,
    staleTime: 35_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("settings:automations:manage");
  return useMutation({
    mutationKey: ["automations", "create"],
    mutationFn: (input: CreateAutomationInput) => {
      assertPermission(canManage);
      return apiClient.post<AutomationRule>("/settings/automations", input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.automations.all }),
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("settings:automations:manage");
  return useMutation({
    mutationKey: ["automations", "update"],
    mutationFn: ({ id, ...input }: UpdateAutomationInput & { id: number }) => {
      assertPermission(canManage);
      return apiClient.patch<AutomationRule>(`/settings/automations/${id}`, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.automations.all }),
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("settings:automations:manage");
  return useMutation({
    mutationKey: ["automations", "toggle"],
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) => {
      assertPermission(canManage);
      return apiClient.patch<AutomationRule>(`/settings/automations/${id}`, { isEnabled });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.automations.all }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("settings:automations:manage");
  return useMutation({
    mutationKey: ["automations", "delete"],
    mutationFn: (id: number) => {
      assertPermission(canManage);
      return apiClient.delete<{ success: boolean }>(`/settings/automations/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.automations.all }),
  });
}

export function useTestAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("settings:automations:manage");
  return useMutation({
    mutationKey: ["automations", "test"],
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => {
      assertPermission(canManage);
      return apiClient.post<AutomationTestResult>(`/settings/automations/${id}/test`, { payload });
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.automations.runs(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.automations.all });
    },
  });
}
