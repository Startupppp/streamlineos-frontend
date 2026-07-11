"use client";

import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  CrmMetadataResponse,
  CrmPipelineWithStages,
  CrmPipelineStage,
  CrmOption,
  CrmOptionType,
  CrmPipelineType,
  CrmValidationRule,
  CrmBlueprint,
  CrmBlueprintTransition,
} from "@/types/crm/metadata";

const CRM_METADATA_STALE_TIME = 5 * 60_000;

type CrmColorFallback = { key: string; label: string; color: string };

export function resolveOption(
  options: CrmOption[],
  key: string
): CrmOption | CrmColorFallback {
  return options.find((o) => o.key === key) ?? { key, label: key, color: "slate" };
}

export function resolveStage(
  stages: CrmPipelineStage[],
  key: string
): CrmPipelineStage | CrmColorFallback {
  return stages.find((s) => s.key === key) ?? { key, label: key, color: "slate" };
}

export function crmMetadataQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.crmMetadata.detail(),
    queryFn: () => apiClient.get<CrmMetadataResponse>("/crm/metadata"),
    staleTime: CRM_METADATA_STALE_TIME,
  });
}

export function useCrmMetadata() {
  return useQuery(crmMetadataQueryOptions());
}

export function useCrmPipelines(type?: CrmPipelineType) {
  return useQuery({
    ...crmMetadataQueryOptions(),
    select: (data: CrmMetadataResponse): CrmPipelineWithStages[] => {
      const active = data.pipelines.filter((p) => p.isActive);
      const sorted = active.slice().sort((a, b) => a.sortOrder - b.sortOrder);
      if (!type) return sorted;
      return sorted.filter((p) => p.type === type);
    },
  });
}

export function useCrmStages(pipelineIdOrType: string) {
  return useQuery({
    ...crmMetadataQueryOptions(),
    select: (data: CrmMetadataResponse): CrmPipelineStage[] => {
      const pipeline =
        data.pipelines.find((p) => p.id === pipelineIdOrType) ??
        data.pipelines.find((p) => p.type === pipelineIdOrType);
      if (!pipeline) return [];
      return pipeline.stages
        .filter((s) => s.isActive)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
  });
}

export function useCrmOptions(type: CrmOptionType) {
  return useQuery({
    ...crmMetadataQueryOptions(),
    select: (data: CrmMetadataResponse): CrmOption[] => {
      const list = data.options[type] ?? [];
      return list
        .filter((o) => o.isActive)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
  });
}

export function useCreatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "pipelines", "create"] as const,
    mutationFn: (input: Omit<CrmPipelineWithStages, "id" | "stages">) =>
      apiClient.post<CrmPipelineWithStages>("/crm/pipelines", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.all });
    },
  });
}

export function useUpdatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "pipelines", "update"] as const,
    mutationFn: ({ id, ...data }: { id: string } & Partial<CrmPipelineWithStages>) =>
      apiClient.patch<CrmPipelineWithStages>(`/crm/pipelines/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.all });
    },
  });
}

export function useDeletePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "pipelines", "delete"] as const,
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/crm/pipelines/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.all });
    },
  });
}

export function useCreateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "stages", "create"] as const,
    mutationFn: ({
      pipelineId,
      ...data
    }: { pipelineId: string } & Omit<CrmPipelineStage, "id" | "pipelineId">) =>
      apiClient.post<CrmPipelineStage>(`/crm/pipelines/${pipelineId}/stages`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.all });
    },
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "stages", "update"] as const,
    mutationFn: ({ id, ...data }: { id: string } & Partial<CrmPipelineStage>) =>
      apiClient.patch<CrmPipelineStage>(`/crm/stages/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.all });
    },
  });
}

export function useDeleteStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "stages", "delete"] as const,
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/crm/stages/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.all });
    },
  });
}

export function useReorderStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "stages", "reorder"] as const,
    mutationFn: ({
      pipelineId,
      stageIds,
    }: {
      pipelineId: string;
      stageIds: string[];
    }) =>
      apiClient.post<{ success: boolean }>(
        `/crm/pipelines/${pipelineId}/stages/reorder`,
        { stageIds }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.all });
    },
  });
}

export function useCreateOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "options", "create"] as const,
    mutationFn: ({
      type,
      ...data
    }: { type: CrmOptionType } & Omit<CrmOption, "id" | "type">) =>
      apiClient.post<CrmOption>(`/crm/options/${type}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.all });
    },
  });
}

export function useUpdateOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "options", "update"] as const,
    mutationFn: ({
      type,
      id,
      ...data
    }: { type: CrmOptionType; id: string } & Partial<CrmOption>) =>
      apiClient.patch<CrmOption>(`/crm/options/${type}/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.all });
    },
  });
}

export function useDeleteOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "options", "delete"] as const,
    mutationFn: ({ type, id }: { type: CrmOptionType; id: string }) =>
      apiClient.delete<{ success: boolean }>(`/crm/options/${type}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.all });
    },
  });
}

export function useValidationRules(params?: Record<string, unknown>) {
  return useQuery({
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
    mutationFn: ({ id, ...data }: { id: string } & Partial<CrmValidationRule>) =>
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
      entityType: string;
      values: Record<string, unknown>;
      pipelineId?: string;
      stageKey?: string;
    }) => apiClient.post<{ errors: Record<string, string> }>("/crm/validation-rules/test", input),
  });
}

export function useBlueprints(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.crmMetadata.blueprints(params),
    queryFn: () => apiClient.get<CrmBlueprint[]>("/crm/blueprints", params),
    staleTime: CRM_METADATA_STALE_TIME,
  });
}

export function useCreateBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "blueprints", "create"] as const,
    mutationFn: (input: Omit<CrmBlueprint, "id" | "createdAt" | "updatedAt">) =>
      apiClient.post<CrmBlueprint>("/crm/blueprints", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.blueprints() });
    },
  });
}

export function useUpdateBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "blueprints", "update"] as const,
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Partial<CrmBlueprint>) =>
      apiClient.patch<CrmBlueprint>(`/crm/blueprints/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.blueprints() });
    },
  });
}

export function useDeleteBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "blueprints", "delete"] as const,
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/crm/blueprints/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.blueprints() });
    },
  });
}

export type {
  CrmMetadataResponse,
  CrmPipelineWithStages,
  CrmPipelineStage,
  CrmOption,
  CrmOptionType,
  CrmValidationRule,
  CrmBlueprint,
  CrmBlueprintTransition,
};
