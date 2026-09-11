"use client";

import { useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  CrmMetadataRaw,
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
import { CRM_METADATA_STALE_TIME } from "./metadata-stale-time";

type CrmColorFallback = { key: string; label: string; color: string };

export function resolveOption(
  options: CrmOption[],
  key: string
): CrmOption | CrmColorFallback {
  return options.find((o) => o.key === key) ?? { key, label: key, color: "slate" };
}

function normalizeRaw(raw: CrmMetadataRaw): CrmMetadataResponse {
  const pipelineMap = new Map<string, CrmPipelineWithStages>(
    raw.pipelines.map((p) => [p.id, { ...p, stages: [] }])
  );
  for (const stage of raw.stages) {
    const pipeline = pipelineMap.get(stage.pipelineId);
    if (pipeline) {
      pipeline.stages.push(stage);
    }
  }
  const optionsByType: Partial<Record<CrmOptionType, CrmOption[]>> = {};
  for (const opt of raw.options) {
    const bucket = optionsByType[opt.type] ?? [];
    bucket.push(opt);
    optionsByType[opt.type] = bucket;
  }
  return {
    pipelines: Array.from(pipelineMap.values()),
    options: optionsByType as Record<CrmOptionType, CrmOption[]>,
  };
}

export function crmMetadataQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.crmMetadata.detail(),
    queryFn: async () => {
      const raw = await apiClient.get<CrmMetadataRaw>("/crm/metadata");
      return normalizeRaw(raw);
    },
    staleTime: CRM_METADATA_STALE_TIME,
  });
}

export function useCrmMetadata() {
  return useGatedQuery("crm:leads:view", {
    ...crmMetadataQueryOptions(),
  });
}

export function useCrmPipelines(type?: CrmPipelineType) {
  return useGatedQuery("crm:leads:view", {
    ...crmMetadataQueryOptions(),
    select: (data: CrmMetadataResponse): CrmPipelineWithStages[] => {
      const active = data.pipelines.filter((p) => p.isActive);
      const sorted = active.slice().sort((a, b) => a.sortOrder - b.sortOrder);
      if (!type) return sorted;
      return sorted.filter((p) => p.type === type);
    },
    staleTime: 30_000,
  });
}

export function useCrmStages(pipelineIdOrType: string) {
  return useGatedQuery("crm:leads:view", {
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
    staleTime: 30_000,
  });
}

export function useCrmOptions(type: CrmOptionType) {
  return useGatedQuery("crm:leads:view", {
    ...crmMetadataQueryOptions(),
    select: (data: CrmMetadataResponse): CrmOption[] => {
      const list = data.options[type] ?? [];
      return list
        .filter((o) => o.isActive)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    staleTime: 30_000,
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
    mutationFn: ({ id, ...data }: { id: string } & Partial<Omit<CrmPipelineWithStages, "stages">>) =>
      apiClient.patch<CrmPipelineWithStages>(`/crm/pipelines/${id}`, data),
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
    mutationFn: ({ id, ...data }: { id: string } & Partial<Omit<CrmPipelineStage, "id">>) =>
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
    }: { type: CrmOptionType; id: string } & Partial<Omit<CrmOption, "id" | "type">>) =>
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

export {
  useValidationRules,
  useCreateValidationRule,
  useUpdateValidationRule,
  useDeleteValidationRule,
  useTestValidationRules,
} from "./validation-rules";
export {
  useBlueprints,
  useCreateBlueprint,
  useUpdateBlueprint,
  useBlueprintTransitions,
  useCreateBlueprintTransition,
  useUpdateBlueprintTransition,
  useDeleteBlueprintTransition,
  useTestTransition,
} from "./blueprints";
export type { CreateTransitionInput, UpdateTransitionInput } from "./blueprints";

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
