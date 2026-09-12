"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { CrmBlueprint, CrmBlueprintTransition } from "@/types/crm/metadata";
import { CRM_METADATA_STALE_TIME } from "./metadata-stale-time";

const blueprintsListLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.blueprintsListContract));
const blueprintLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.blueprintContract));
const blueprintTransitionsListLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.blueprintTransitionsListContract));
const blueprintTransitionLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.blueprintTransitionContract));
const deleteSuccessLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.deleteSuccessContract));
const testTransitionLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.testTransitionContract));

export function useBlueprints(params?: Record<string, unknown>) {
  return useGatedQuery("crm:settings:view", {
    queryKey: queryKeys.crmMetadata.blueprints(params),
    queryFn: ({ signal }) => apiClient.get<CrmBlueprint[]>("/crm/blueprints", params, signal, blueprintsListLazy),
    staleTime: CRM_METADATA_STALE_TIME,
  });
}

export function useCreateBlueprint() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:settings:manage", {
    mutationKey: ["crmMetadata", "blueprints", "create"] as const,
    mutationFn: (input: Omit<CrmBlueprint, "id" | "createdAt" | "updatedAt">) =>
      apiClient.post<CrmBlueprint>("/crm/blueprints", input, undefined, blueprintLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.blueprints() });
    },
  });
}

export function useUpdateBlueprint() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:settings:manage", {
    mutationKey: ["crmMetadata", "blueprints", "update"] as const,
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Partial<Omit<CrmBlueprint, "id" | "createdAt" | "updatedAt">>) =>
      apiClient.patch<CrmBlueprint>(`/crm/blueprints/${id}`, data, undefined, blueprintLazy),
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
    queryFn: ({ signal }) =>
      apiClient.get<CrmBlueprintTransition[]>(`/crm/blueprints/${blueprintId}/transitions`, undefined, signal, blueprintTransitionsListLazy),
    enabled: blueprintId !== null,
    staleTime: 60_000,
  });
}

export function useCreateBlueprintTransition(blueprintId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:settings:manage", {
    mutationKey: ["crmMetadata", "blueprints", blueprintId, "transitions", "create"] as const,
    mutationFn: (input: CreateTransitionInput) =>
      apiClient.post<CrmBlueprintTransition>(`/crm/blueprints/${blueprintId}/transitions`, input, undefined, blueprintTransitionLazy),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.blueprintTransitions(blueprintId) });
    },
  });
}

export function useUpdateBlueprintTransition(blueprintId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:settings:manage", {
    mutationKey: ["crmMetadata", "blueprints", blueprintId, "transitions", "update"] as const,
    mutationFn: ({ id, ...data }: { id: string } & UpdateTransitionInput) =>
      apiClient.patch<CrmBlueprintTransition>(
        `/crm/blueprints/${blueprintId}/transitions/${id}`,
        data,
        undefined,
        blueprintTransitionLazy,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.blueprintTransitions(blueprintId) });
    },
  });
}

export function useDeleteBlueprintTransition(blueprintId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:settings:manage", {
    mutationKey: ["crmMetadata", "blueprints", blueprintId, "transitions", "delete"] as const,
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(
        `/crm/blueprints/${blueprintId}/transitions/${id}`,
        undefined,
        undefined,
        deleteSuccessLazy,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmMetadata.blueprintTransitions(blueprintId) });
    },
  });
}

export function useTestTransition(blueprintId: string) {
  return useAuthorizedMutation("crm:settings:view", {
    mutationKey: ["crmMetadata", "blueprints", blueprintId, "test"] as const,
    mutationFn: (input: {
      fromStageKey: string;
      toStageKey: string;
      sampleFields: Record<string, string>;
    }) => apiClient.post<{ allowed: boolean; requiresApproval: boolean; missingFields: string[] }>(`/crm/blueprints/${blueprintId}/test`, input, undefined, testTransitionLazy),
  });
}
