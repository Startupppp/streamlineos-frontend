"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const assignmentRulesLazy = lazyContract(() =>
  import("@/hooks/api/crm/settings/assignment-rules-schema").then((m) => m.assignmentRulesListContract),
);
const assignmentPreviewLazy = lazyContract(() =>
  import("@/hooks/api/crm/settings/assignment-rules-schema").then((m) => m.assignmentPreviewContract),
);
const assignmentRuleLazy = lazyContract(() =>
  import("@/hooks/api/crm/settings/assignment-rules-schema").then((m) => m.assignmentRuleContract),
);
const deleteAssignmentRuleLazy = lazyContract(() =>
  import("@/hooks/api/crm/settings/assignment-rules-schema").then((m) => m.deleteAssignmentRuleContract),
);

export type AssignmentType =
  | "assign_user"
  | "round_robin"
  | "weighted_round_robin"
  | "least_loaded"
  | "territory";

export interface AssignmentRuleCondition {
  field: string;
  operator: string;
  value: string;
}

export interface WeightedMember {
  userId: string;
  weight: number;
}

export interface AssignmentRule {
  id: number;
  orgId: string;
  name: string;
  assignmentType: AssignmentType;
  assignToUserId: string | null;
  roundRobinUserIds: string[] | null;
  weightedMembers: WeightedMember[] | null;
  windowHours: number | null;
  territoryId: number | null;
  conditions: AssignmentRuleCondition[];
  priority: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateAssignmentRuleInput {
  name: string;
  assignmentType: AssignmentType;
  assignToUserId?: string;
  roundRobinUserIds?: string[];
  weightedMembers?: WeightedMember[];
  windowHours?: number;
  territoryId?: number;
  conditions: AssignmentRuleCondition[];
  priority?: number;
  isActive?: boolean;
}

export interface UpdateAssignmentRuleInput {
  id: number;
  name?: string;
  assignmentType?: AssignmentType;
  assignToUserId?: string;
  roundRobinUserIds?: string[];
  weightedMembers?: WeightedMember[];
  windowHours?: number;
  territoryId?: number;
  conditions?: AssignmentRuleCondition[];
  priority?: number;
  isActive?: boolean;
}

interface ReorderAssignmentRulesInput {
  ruleIds: number[];
}

export interface AssignmentPreviewResult {
  matchedRule: { id: number; name: string } | null;
  wouldAssignTo: string | null;
  trace: Array<{
    ruleId: number;
    ruleName: string;
    matched: boolean;
    reason: string;
  }>;
}

export function useAssignmentRules() {
  return useGatedQuery("crm:assignment-rules:manage", {
    queryKey: queryKeys.crmSettings.assignmentRules(),
    queryFn: ({ signal }) => apiClient.get<AssignmentRule[]>("/crm/assignment-rules", undefined, signal, assignmentRulesLazy),
    staleTime: 2 * 60_000,
  });
}

export function useCreateAssignmentRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:assignment-rules:manage", {
    mutationKey: ["crm-settings", "assignment-rules", "create"],
    mutationFn: (input: CreateAssignmentRuleInput) =>
      apiClient.post<AssignmentRule>("/crm/assignment-rules", input, undefined, assignmentRuleLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.assignmentRules() });
    },
  });
}

export function useUpdateAssignmentRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:assignment-rules:manage", {
    mutationKey: ["crm-settings", "assignment-rules", "update"],
    mutationFn: ({ id, ...data }: UpdateAssignmentRuleInput) =>
      apiClient.patch<AssignmentRule>(`/crm/assignment-rules/${id}`, data, undefined, assignmentRuleLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.assignmentRules() });
    },
  });
}

export function useDeleteAssignmentRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:assignment-rules:manage", {
    mutationKey: ["crm-settings", "assignment-rules", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/assignment-rules/${id}`, undefined, undefined, deleteAssignmentRuleLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.assignmentRules() });
    },
  });
}

export function useReorderAssignmentRules() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:assignment-rules:manage", {
    mutationKey: ["crm-settings", "assignment-rules", "reorder"],
    mutationFn: (input: ReorderAssignmentRulesInput) =>
      apiClient.patch<{ success: boolean }>("/crm/assignment-rules/reorder", input, undefined, deleteAssignmentRuleLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.assignmentRules() });
    },
  });
}

export function usePreviewAssignmentRule() {
  return useAuthorizedMutation("crm:assignment-rules:manage", {
    mutationKey: ["crm-settings", "assignment-rules", "preview"],
    mutationFn: (sampleLead: {
      source?: string;
      priority?: string;
      score?: number;
      city?: string;
    }) =>
      apiClient.post<AssignmentPreviewResult>("/crm/assignment-rules/preview", { sampleLead }, undefined, assignmentPreviewLazy),
  });
}
