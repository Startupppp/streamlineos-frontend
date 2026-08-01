"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type CustomFieldType = "text" | "number" | "select" | "checkbox" | "date";

export interface SupportCustomField {
  id: number;
  orgId: string;
  key: string;
  label: string;
  fieldType: CustomFieldType;
  options: string[] | null;
  required: boolean;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomFieldInput {
  key: string;
  label: string;
  fieldType: CustomFieldType;
  options?: string[];
  required?: boolean;
  category?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCustomFieldInput {
  label?: string;
  options?: string[];
  required?: boolean;
  category?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export function useSupportCustomFields(activeOnly?: boolean) {
  return useQuery({
    queryKey: queryKeys.supportCustomFields.list(activeOnly),
    queryFn: () =>
      apiClient.get<SupportCustomField[]>("/support/custom-fields", activeOnly ? { activeOnly: "true" } : undefined),
    staleTime: 60_000,
  });
}

export function usePortalActiveCustomFields() {
  return useQuery({
    queryKey: queryKeys.supportCustomFields.portalActive(),
    queryFn: () => apiClient.get<SupportCustomField[]>("/support/portal/custom-fields"),
    staleTime: 60_000,
  });
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportCustomFields", "create"] as const,
    mutationFn: (input: CreateCustomFieldInput) =>
      apiClient.post<SupportCustomField>("/support/custom-fields", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportCustomFields.all }),
  });
}

export function useUpdateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportCustomFields", "update"] as const,
    mutationFn: ({ id, input }: { id: number; input: UpdateCustomFieldInput }) =>
      apiClient.patch<SupportCustomField>(`/support/custom-fields/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportCustomFields.all }),
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportCustomFields", "delete"] as const,
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/support/custom-fields/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportCustomFields.all }),
  });
}
