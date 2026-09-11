"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { CrmBlueprint, CrmBlueprintTransition } from "@/types/crm/metadata";
import { CRM_METADATA_STALE_TIME } from "./metadata-stale-time";

export function useBlueprints(params?: Record<string, unknown>) {
  return useGatedQuery("crm:settings:view", {
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
    }: { id: string } & Partial<Omit<CrmBlueprint, "id" | "createdAt" | "updatedAt">>) =>
      apiClient.patch<CrmBlueprint>(`/crm/blueprints/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.blueprints() });
    },
  });
}

export type CreateTransitionInput = {
  fromStageKey: string;
  toStageKey: string;
  requiredFields: string[];
  requiredActivityTypeKeys: string[];
  requiresApproval: boolean;
  requiresQuote: boolean;
};
export type UpdateTransitionInput = Partial<CreateTransitionInput>;

export function useBlueprintTransitions(blueprintId: string | null) {
  return useGatedQuery("crm:settings:view", {
    queryKey: queryKeys.crmMetadata.blueprintTransitions(blueprintId),
    queryFn: () =>
      apiClient.get<CrmBlueprintTransition[]>(`/crm/blueprints/${blueprintId}/transitions`),
    enabled: blueprintId !== null,
    staleTime: 60_000,
  });
}

export function useCreateBlueprintTransition(blueprintId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "blueprints", blueprintId, "transitions", "create"] as const,
    mutationFn: (input: CreateTransitionInput) =>
      apiClient.post<CrmBlueprintTransition>(`/crm/blueprints/${blueprintId}/transitions`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.blueprintTransitions(blueprintId) });
    },
  });
}

export function useUpdateBlueprintTransition(blueprintId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "blueprints", blueprintId, "transitions", "update"] as const,
    mutationFn: ({ id, ...data }: { id: string } & UpdateTransitionInput) =>
      apiClient.patch<CrmBlueprintTransition>(
        `/crm/blueprints/${blueprintId}/transitions/${id}`,
        data
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.blueprintTransitions(blueprintId) });
    },
  });
}

export function useDeleteBlueprintTransition(blueprintId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "blueprints", blueprintId, "transitions", "delete"] as const,
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(
        `/crm/blueprints/${blueprintId}/transitions/${id}`
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.blueprintTransitions(blueprintId) });
    },
  });
}

export function useTestTransition(blueprintId: string) {
  return useMutation({
    mutationKey: ["crmMetadata", "blueprints", blueprintId, "test"] as const,
    mutationFn: (input: {
      fromStageKey: string;
      toStageKey: string;
      sampleFields: Record<string, string>;
    }) => apiClient.post<{ allowed: boolean; missing: string[] }>(`/crm/blueprints/${blueprintId}/test`, input),
  });
}
