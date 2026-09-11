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

/**
 * The two the `assignment_type` column will hold. `assignmentRuleCreateSchema`
 * is `.strict()` and its `assignmentType` is this enum and no wider, so sending
 * one of the three extended names is a 400 and not a value.
 */
export type BaseAssignmentType = "assign_user" | "round_robin";

/**
 * What the rule actually does, which the server reads as
 * `assignmentTypeText ?? assignmentType` (`crm-rules.service.ts`). The three
 * beyond the base pair live in the separate `assignmentTypeText` column.
 */
export type AssignmentType =
  | BaseAssignmentType
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

/**
 * The `config` jsonb column, and the only home the extended arms have.
 *
 * `weights` is keyed by user id, which is why the weighted editor is a list of
 * rows here and a record there. `fallbackUserId` is who a territory rule falls
 * to when no territory matches. There is no window key: `resolveAssignment`
 * counts a member's open leads with no date filter at all, so a control for one
 * would store a number nothing reads.
 */
export interface AssignmentRuleConfig {
  weights?: Record<string, number>;
  fallbackUserId?: string;
}

export interface AssignmentRule {
  id: number;
  orgId: string;
  name: string;
  assignmentType: BaseAssignmentType;
  assignmentTypeText: AssignmentType | null;
  assignToUserId: string | null;
  roundRobinUserIds: string[] | null;
  config: AssignmentRuleConfig | null;
  conditions: AssignmentRuleCondition[];
  priority: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateAssignmentRuleInput {
  name: string;
  assignmentType: BaseAssignmentType;
  assignmentTypeText?: AssignmentType;
  assignToUserId?: string;
  roundRobinUserIds?: string[];
  config?: AssignmentRuleConfig;
  conditions: AssignmentRuleCondition[];
  priority?: number;
  isActive?: boolean;
}

export interface UpdateAssignmentRuleInput {
  id: number;
  name?: string;
  assignmentType?: BaseAssignmentType;
  assignmentTypeText?: AssignmentType;
  assignToUserId?: string;
  roundRobinUserIds?: string[];
  config?: AssignmentRuleConfig;
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
