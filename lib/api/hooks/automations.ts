"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type AutomationTrigger =
  | "lead.created"
  | "deal.stage_changed"
  | "ticket.created"
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
  | { type: "webhook"; config: { event: string } };

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

export interface AutomationRun {
  id: number;
  triggerEvent: string;
  status: AutomationRunStatus;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
}

export interface AutomationActionResult {
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

export interface CreateAutomationInput {
  name: string;
  description?: string;
  triggerEvent: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isEnabled: boolean;
}

export interface UpdateAutomationInput {
  name?: string;
  description?: string | null;
  triggerEvent?: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions?: AutomationAction[];
  isEnabled?: boolean;
}

export function useAutomations() {
  return useQuery({
    queryKey: queryKeys.automations.list(),
    queryFn: () => apiClient.get<AutomationRule[]>("/settings/automations"),
    staleTime: 30_000,
  });
}

export function useAutomation(id: number) {
  return useQuery({
    queryKey: queryKeys.automations.detail(id),
    queryFn: () => apiClient.get<AutomationRule>(`/settings/automations/${id}`),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  });
}

export function useAutomationRuns(ruleId: number) {
  return useQuery({
    queryKey: queryKeys.automations.runs(ruleId),
    queryFn: () => apiClient.get<AutomationRun[]>(`/settings/automations/${ruleId}/runs`),
    enabled: Number.isFinite(ruleId) && ruleId > 0,
    staleTime: 15_000,
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAutomationInput) =>
      apiClient.post<AutomationRule>("/settings/automations", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.automations.all }),
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateAutomationInput & { id: number }) =>
      apiClient.patch<AutomationRule>(`/settings/automations/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.automations.all }),
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) =>
      apiClient.patch<AutomationRule>(`/settings/automations/${id}`, { isEnabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.automations.all }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/settings/automations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.automations.all }),
  });
}

export function useTestAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiClient.post<AutomationTestResult>(`/settings/automations/${id}/test`, { payload }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.automations.runs(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.automations.all });
    },
  });
}
