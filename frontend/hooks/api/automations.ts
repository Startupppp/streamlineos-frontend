"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AutomationTrigger } from "@/lib/automations/automation-triggers";

function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission to manage automations.");
}

export type { AutomationTrigger };

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
  | { type: "support_internal_note"; config: { body: string } }
  | { type: "ai_classify"; config: Record<string, unknown> }
  | { type: "ai_summarize"; config: Record<string, unknown> }
  | { type: "ai_extract"; config: Record<string, unknown> }
  | { type: "ai_routing_suggestion"; config: Record<string, unknown> };

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
  triggerEvent?: string;
  conditions?: AutomationCondition[];
  actions?: AutomationAction[];
  isEnabled?: boolean;
}

export interface PaginatedAutomations {
  data: AutomationRule[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

interface AutomationListParams {
  cursor?: string;
  limit?: number;
}

export function useAutomations(params?: AutomationListParams) {
  const canView = useCan("settings:automations:view");
  return useQuery({
    queryKey: [...knowledgeAndSurveysQueryKeys.automations.all, "list", params] as const,
    queryFn: ({ signal }) => {
      const search = new URLSearchParams();
      if (params?.cursor) search.set("cursor", params.cursor);
      if (params?.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      return apiClient.get<PaginatedAutomations>(`/settings/automations${qs ? `?${qs}` : ""}`, undefined, signal);
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useAutomationRuns(ruleId: number) {
  const canView = useCan("settings:automations:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.automations.runs(ruleId),
    queryFn: ({ signal }) => apiClient.get<AutomationRun[]>(`/settings/automations/${ruleId}/runs`, undefined, signal),
    enabled: canView && Number.isFinite(ruleId) && ruleId > 0,
    staleTime: 35_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("settings:automations:manage");
  return useAuthorizedMutation("settings:automations:manage", {
    mutationKey: ["automations", "create"],
    mutationFn: (input: CreateAutomationInput) => {
      assertPermission(canManage);
      return apiClient.post<AutomationRule>("/settings/automations", input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.automations.all }),
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("settings:automations:manage");
  return useAuthorizedMutation("settings:automations:manage", {
    mutationKey: ["automations", "update"],
    mutationFn: ({ id, ...input }: UpdateAutomationInput & { id: number }) => {
      assertPermission(canManage);
      return apiClient.patch<AutomationRule>(`/settings/automations/${id}`, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.automations.all }),
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("settings:automations:manage");
  return useAuthorizedMutation("settings:automations:manage", {
    mutationKey: ["automations", "toggle"],
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) => {
      assertPermission(canManage);
      return apiClient.patch<AutomationRule>(`/settings/automations/${id}`, { isEnabled });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.automations.all }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("settings:automations:manage");
  return useAuthorizedMutation("settings:automations:manage", {
    mutationKey: ["automations", "delete"],
    mutationFn: (id: number) => {
      assertPermission(canManage);
      return apiClient.delete<{ success: boolean }>(`/settings/automations/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.automations.all }),
  });
}

export function useTestAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("settings:automations:manage");
  return useAuthorizedMutation("settings:automations:manage", {
    mutationKey: ["automations", "test"],
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => {
      assertPermission(canManage);
      return apiClient.post<AutomationTestResult>(`/settings/automations/${id}/test`, { payload });
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.automations.runs(variables.id) });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.automations.all });
    },
  });
}
