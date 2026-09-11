"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { CrmValidationRule } from "@/types/crm/metadata";
import { CRM_METADATA_STALE_TIME } from "./metadata-stale-time";

const validationRulesListLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.validationRulesListContract));
const validationRuleLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.validationRuleContract));
const testValidationLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.testValidationContract));
const deleteSuccessLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.deleteSuccessContract));

export function useValidationRules(params?: Record<string, unknown>) {
  return useGatedQuery("crm:settings:view", {
    queryKey: queryKeys.crmMetadata.validationRules(params),
    queryFn: ({ signal }) =>
      apiClient.get<CrmValidationRule[]>("/crm/validation-rules", params, signal, validationRulesListLazy),
    staleTime: CRM_METADATA_STALE_TIME,
  });
}

export function useCreateValidationRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:settings:manage", {
    mutationKey: ["crmMetadata", "validationRules", "create"] as const,
    mutationFn: (input: Omit<CrmValidationRule, "id">) =>
      apiClient.post<CrmValidationRule>("/crm/validation-rules", input, undefined, validationRuleLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.validationRules() });
    },
  });
}

export function useUpdateValidationRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:settings:manage", {
    mutationKey: ["crmMetadata", "validationRules", "update"] as const,
    mutationFn: ({ id, ...data }: { id: string } & Partial<Omit<CrmValidationRule, "id">>) =>
      apiClient.patch<CrmValidationRule>(`/crm/validation-rules/${id}`, data, undefined, validationRuleLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.validationRules() });
    },
  });
}

export function useDeleteValidationRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:settings:manage", {
    mutationKey: ["crmMetadata", "validationRules", "delete"] as const,
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/crm/validation-rules/${id}`, undefined, undefined, deleteSuccessLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.validationRules() });
    },
  });
}

export function useTestValidationRules() {
  return useAuthorizedMutation("crm:settings:view", {
    mutationKey: ["crmMetadata", "validationRules", "test"] as const,
    mutationFn: (input: {
      entityType: CrmValidationRule["entityType"];
      record: Record<string, unknown>;
      pipelineId?: string;
      stageKey?: string;
      sourceKey?: string;
    }) => apiClient.post<{ valid: boolean; errors: { field: string; ruleType: string; message: string }[] }>("/crm/validation-rules/test", input, undefined, testValidationLazy),
  });
}
