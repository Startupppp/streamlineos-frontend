"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  CrmAutomationEvent,
  CrmAutomationAction,
  CrmAutomationRule,
  AutomationRun,
} from "@/types/crm";

interface AutomationRunsResponse {
  runs: AutomationRun[];
  total: number;
}

interface TestRuleInput {
  id: number;
  payload?: Record<string, unknown>;
}

interface TestRuleResult {
  matched: boolean;
  nodes: Array<{ nodeId: string; type: string; result: string }>;
}

/**
 * Mirrors the backend write contract, which is now `.strict()`. Deriving this
 * from the READ type (`Omit<CrmAutomationRule, "id">`) forced callers to send
 * server-owned fields — `executionCount`, `lastRunAt`, `version`, `createdAt` —
 * which the API would reject.
 */
type CreateRuleInput = {
  name: string;
  trigger: string;
  conditions: CrmAutomationRule["conditions"];
  actions: CrmAutomationRule["actions"];
  isActive?: boolean;
  graph?: CrmAutomationRule["graph"];
  isDraft?: boolean;
  cooldownMinutes?: number;
};
type UpdateRuleInput = { id: number } & Partial<CreateRuleInput>;

export function useAutomationEvents() {
  return useGatedQuery("crm:automations:manage", {
    queryKey: queryKeys.crmAutomations.events(),
    queryFn: () =>
      apiClient.get<{ events: CrmAutomationEvent[] }>("/crm/automation/events"),
    staleTime: 5 * 60_000,
  });
}

export function useAutomationActions() {
  return useGatedQuery("crm:automations:manage", {
    queryKey: queryKeys.crmAutomations.actions(),
    queryFn: () =>
      apiClient.get<{ actions: CrmAutomationAction[] }>(
        "/crm/automation/actions"
      ),
    staleTime: 5 * 60_000,
  });
}

export function useCrmAutomationRules() {
  return useGatedQuery("crm:automations:manage", {
    queryKey: queryKeys.crmAutomations.list(),
    queryFn: () =>
      apiClient.get<{ rules: CrmAutomationRule[] }>("/crm/automations"),
    staleTime: 30_000,
  });
}

export function useCreateCrmAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmAutomations", "create"] as const,
    mutationFn: (input: CreateRuleInput) =>
      apiClient.post<CrmAutomationRule>("/crm/automations", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmAutomations.all });
    },
  });
}

export function useUpdateCrmAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmAutomations", "update"] as const,
    mutationFn: ({ id, ...data }: UpdateRuleInput) =>
      apiClient.patch<CrmAutomationRule>(`/crm/automations/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmAutomations.all });
    },
  });
}

export function useDeleteCrmAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmAutomations", "delete"] as const,
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/automations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmAutomations.all });
    },
  });
}

export function useEnableCrmAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmAutomations", "enable"] as const,
    mutationFn: (ruleId: number) =>
      apiClient.patch<CrmAutomationRule>(
        `/crm/automations/${ruleId}/enable`,
        {}
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmAutomations.all });
    },
  });
}

export function useDisableCrmAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmAutomations", "disable"] as const,
    mutationFn: (ruleId: number) =>
      apiClient.patch<CrmAutomationRule>(
        `/crm/automations/${ruleId}/disable`,
        {}
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmAutomations.all });
    },
  });
}

export function useTestCrmAutomationRule() {
  return useMutation({
    mutationKey: ["crmAutomations", "test"] as const,
    mutationFn: ({ id, payload }: TestRuleInput) =>
      apiClient.post<TestRuleResult>(`/crm/automations/${id}/test`, {
        payload,
      }),
  });
}

export function useCrmAutomationRuns(ruleId: number, page: number) {
  return useGatedQuery("crm:automations:manage", {
    queryKey: queryKeys.crmAutomations.runs(ruleId, page),
    queryFn: () =>
      apiClient.get<AutomationRunsResponse>(
        `/crm/automations/${ruleId}/runs`,
        { page, limit: 20 }
      ),
    staleTime: 30_000,
  });
}
