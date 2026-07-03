"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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

interface UpdateCustomFieldInput {
  id: number;
  entityType: "lead" | "deal" | "contact";
  label?: string;
  options?: Array<{ value: string; label: string }> | null;
  isRequired?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export function useCustomFields(entityType: "lead" | "deal" | "contact") {
  return useQuery({
    queryKey: queryKeys.settings.customFields(entityType),
    queryFn: () =>
      apiClient.get<{ fields: CustomFieldDefinition[] }>(
        `/settings/custom-fields?entityType=${entityType}`
      ),
    staleTime: 2 * 60_000,
  });
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["settings", "customFields", "create"],
    mutationFn: (input: CreateCustomFieldInput) =>
      apiClient.post<{ field: CustomFieldDefinition }>("/settings/custom-fields", input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.customFields(vars.entityType) });
    },
  });
}

export function useUpdateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["settings", "customFields", "update"],
    mutationFn: ({ id, entityType: _entityType, ...data }: UpdateCustomFieldInput) =>
      apiClient.patch<{ field: CustomFieldDefinition }>(`/settings/custom-fields/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.customFields(vars.entityType) });
    },
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["settings", "customFields", "delete"],
    mutationFn: ({ id }: { id: number; entityType: "lead" | "deal" | "contact" }) =>
      apiClient.delete<{ success: boolean }>(`/settings/custom-fields/${id}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.customFields(vars.entityType) });
    },
  });
}
