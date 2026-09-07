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
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


import { lazyContract } from "@/lib/api-envelope";

const automationEventsLazy = lazyContract(() =>
  import("@/hooks/api/crm/automations-schema").then((m) => m.automationEventsListContract),
);
const automationActionsLazy = lazyContract(() =>
  import("@/hooks/api/crm/automations-schema").then((m) => m.automationActionsListContract),
);
const automationRulesLazy = lazyContract(() =>
  import("@/hooks/api/crm/automations-schema").then((m) => m.automationRulesListContract),
);
const automationRunsLazy = lazyContract(() =>
  import("@/hooks/api/crm/automations-schema").then((m) => m.automationRunsPageContract),
);
const automationRuleLazy = lazyContract(() =>
  import("@/hooks/api/crm/automations-schema").then((m) => m.automationRuleContract),
);
const deleteAutomationRuleLazy = lazyContract(() =>
  import("@/hooks/api/crm/automations-schema").then((m) => m.deleteAutomationRuleContract),
);
const testRuleLazy = lazyContract(() =>
  import("@/hooks/api/crm/automations-schema").then((m) => m.testRuleResultContract),
);
interface AutomationRunsResponse {
  runs: AutomationRun[];
  hasMore: boolean;
  nextCursor: string | null;
  total?: number;
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
    queryFn: ({ signal }) =>
      apiClient.get<{ events: CrmAutomationEvent[] }>("/crm/automation/events", undefined, signal, automationEventsLazy),
    staleTime: 5 * 60_000,
  });
}

export function useAutomationActions() {
  return useGatedQuery("crm:automations:manage", {
    queryKey: queryKeys.crmAutomations.actions(),
    queryFn: ({ signal }) =>
      apiClient.get<{ actions: CrmAutomationAction[] }>(
        "/crm/automation/actions"
      , undefined, signal, automationActionsLazy),
    staleTime: 5 * 60_000,
  });
}

export function useCrmAutomationRules() {
  return useGatedQuery("crm:automations:manage", {
    queryKey: queryKeys.crmAutomations.list(),
    queryFn: ({ signal }) =>
      apiClient.get<{ rules: CrmAutomationRule[] }>("/crm/automations", undefined, signal, automationRulesLazy),
    staleTime: 30_000,
  });
}

export function useCreateCrmAutomationRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:automations:manage", {
    mutationKey: ["crmAutomations", "create"] as const,
    mutationFn: (input: CreateRuleInput) =>
      apiClient.post<CrmAutomationRule>("/crm/automations", input, undefined, automationRuleLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmAutomations.all });
    },
  });
}

export function useUpdateCrmAutomationRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:automations:manage", {
    mutationKey: ["crmAutomations", "update"] as const,
    mutationFn: ({ id, ...data }: UpdateRuleInput) =>
      apiClient.patch<CrmAutomationRule>(`/crm/automations/${id}`, data, undefined, automationRuleLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmAutomations.all });
    },
  });
}

export function useDeleteCrmAutomationRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:automations:manage", {
    mutationKey: ["crmAutomations", "delete"] as const,
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/automations/${id}`, undefined, undefined, deleteAutomationRuleLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmAutomations.all });
    },
  });
}

export function useEnableCrmAutomationRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:automations:manage", {
    mutationKey: ["crmAutomations", "enable"] as const,
    mutationFn: (ruleId: number) =>
      apiClient.patch<CrmAutomationRule>(
        `/crm/automations/${ruleId}/enable`,
        {},
        undefined,
        automationRuleLazy,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmAutomations.all });
    },
  });
}

export function useDisableCrmAutomationRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:automations:manage", {
    mutationKey: ["crmAutomations", "disable"] as const,
    mutationFn: (ruleId: number) =>
      apiClient.patch<CrmAutomationRule>(
        `/crm/automations/${ruleId}/disable`,
        {},
        undefined,
        automationRuleLazy,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmAutomations.all });
    },
  });
}

export function useTestCrmAutomationRule() {
  return useAuthorizedMutation("crm:automations:manage", {
    mutationKey: ["crmAutomations", "test"] as const,
    mutationFn: ({ id, payload }: TestRuleInput) =>
      apiClient.post<TestRuleResult>(`/crm/automations/${id}/test`, {
        payload,
      }, undefined, testRuleLazy),
  });
}

export function useCrmAutomationRuns(ruleId: number, cursor?: string) {
  return useGatedQuery("crm:automations:manage", {
    queryKey: queryKeys.crmAutomations.runs(ruleId, cursor),
    queryFn: ({ signal }) =>
      apiClient.get<AutomationRunsResponse>(
        `/crm/automations/${ruleId}/runs`,
        cursor ? { cursor } : undefined,
        signal,
        automationRunsLazy,
      ),
    staleTime: 30_000,
  });
}
