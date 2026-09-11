"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

import { lazyContract } from "@/lib/api-envelope";
const customFieldsListLazy = lazyContract(() => import("@/hooks/api/crm/custom-fields-schema").then((m) => m.customFieldsListContract));
const customFieldMutatedLazy = lazyContract(() => import("@/hooks/api/crm/custom-fields-schema").then((m) => m.customFieldMutatedContract));
const deleteCustomFieldLazy = lazyContract(() => import("@/hooks/api/crm/custom-fields-schema").then((m) => m.deleteCustomFieldContract));

export interface CustomFieldDefinition {
  id: number;
  orgId: string;
  entityType: "lead" | "deal" | "contact";
  name: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean" | "select";
  options: Array<{ value: string; label: string }> | null;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateCustomFieldInput {
  entityType: "lead" | "deal" | "contact";
  name: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean" | "select";
  options?: Array<{ value: string; label: string }>;
  isRequired?: boolean;
  sortOrder?: number;
}

export interface UpdateCustomFieldInput {
  id: number;
  entityType: "lead" | "deal" | "contact";
  label?: string;
  options?: Array<{ value: string; label: string }> | null;
  isRequired?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export function useCustomFields(entityType: "lead" | "deal" | "contact") {
  const canManage = useCan("settings:custom-fields:manage");
  return useQuery({
    queryKey: queryKeys.settings.customFields(entityType),
    queryFn: ({ signal }) =>
      apiClient.get<{ fields: CustomFieldDefinition[] }>(
        `/settings/custom-fields?entityType=${entityType}`
      , undefined, signal, customFieldsListLazy),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:custom-fields:manage", {
    mutationKey: ["settings", "customFields", "create"],
    mutationFn: (input: CreateCustomFieldInput) =>
      apiClient.post<{ field: CustomFieldDefinition }>("/settings/custom-fields", input, undefined, customFieldMutatedLazy),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.customFields(vars.entityType) });
    },
  });
}

export function useUpdateCustomField() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:custom-fields:manage", {
    mutationKey: ["settings", "customFields", "update"],
    mutationFn: ({ id, ...data }: UpdateCustomFieldInput) =>
      apiClient.patch<{ field: CustomFieldDefinition }>(`/settings/custom-fields/${id}`, data, undefined, customFieldMutatedLazy),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.customFields(vars.entityType) });
    },
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:custom-fields:manage", {
    mutationKey: ["settings", "customFields", "delete"],
    mutationFn: ({ id }: { id: number; entityType: "lead" | "deal" | "contact" }) =>
      apiClient.delete<{ success: boolean }>(`/settings/custom-fields/${id}`, undefined, undefined, deleteCustomFieldLazy),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.customFields(vars.entityType) });
    },
  });
}
