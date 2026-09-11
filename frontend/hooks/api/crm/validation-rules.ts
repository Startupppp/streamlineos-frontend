"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { CrmValidationRule } from "@/types/crm/metadata";
import { CRM_METADATA_STALE_TIME } from "./metadata-stale-time";

export function useValidationRules(params?: Record<string, unknown>) {
  return useGatedQuery("crm:settings:view", {
    queryKey: queryKeys.crmMetadata.validationRules(params),
    queryFn: () =>
      apiClient.get<CrmValidationRule[]>("/crm/validation-rules", params),
    staleTime: CRM_METADATA_STALE_TIME,
  });
}

export function useCreateValidationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "validationRules", "create"] as const,
    mutationFn: (input: Omit<CrmValidationRule, "id">) =>
      apiClient.post<CrmValidationRule>("/crm/validation-rules", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.validationRules() });
    },
  });
}

export function useUpdateValidationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "validationRules", "update"] as const,
    mutationFn: ({ id, ...data }: { id: string } & Partial<Omit<CrmValidationRule, "id">>) =>
      apiClient.patch<CrmValidationRule>(`/crm/validation-rules/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.validationRules() });
    },
  });
}

export function useDeleteValidationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "validationRules", "delete"] as const,
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/crm/validation-rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.validationRules() });
    },
  });
}

export function useTestValidationRules() {
  return useMutation({
    mutationKey: ["crmMetadata", "validationRules", "test"] as const,
    mutationFn: (input: {
      entityType: CrmValidationRule["entityType"];
      record: Record<string, unknown>;
      pipelineId?: string;
      stageKey?: string;
      sourceKey?: string;
    }) => apiClient.post<{ errors: Record<string, string> }>("/crm/validation-rules/test", input),
  });
}
