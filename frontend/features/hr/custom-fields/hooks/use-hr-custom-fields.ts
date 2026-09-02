"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  CreateCustomFieldPayload,
  HrCustomFieldDefinition,
  UpdateCustomFieldPayload,
} from "@/features/hr/forms/lib/types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

function cfDefsKey(entityType: string) {
  return ["hr", "custom-fields", "definitions", entityType] as const;
}

export function useHrCustomFields(
  entityType: string = "employee",
  options?: { enabled?: boolean },
) {
  return useQuery<HrCustomFieldDefinition[]>({
    queryKey: cfDefsKey(entityType),
    queryFn: ({ signal }) =>
      apiClient.get<HrCustomFieldDefinition[]>("/hr/custom-fields/definitions", { entityType }, signal),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateCustomField(entityType: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation<HrCustomFieldDefinition, Error, CreateCustomFieldPayload>("hr:custom-fields:manage", {
    mutationKey: ["hr", "custom-fields", "create"],
    mutationFn: (payload) =>
      apiClient.post<HrCustomFieldDefinition>("/hr/custom-fields/definitions", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: cfDefsKey(entityType) }),
  });
}

export function useUpdateCustomField(entityType: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation<HrCustomFieldDefinition, Error, { id: number; payload: UpdateCustomFieldPayload }>("hr:custom-fields:manage", {
    mutationKey: ["hr", "custom-fields", "update"],
    mutationFn: ({ id, payload }) =>
      apiClient.patch<HrCustomFieldDefinition>(`/hr/custom-fields/definitions/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: cfDefsKey(entityType) }),
  });
}

export function useDeleteCustomField(entityType: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("hr:custom-fields:manage", {
    mutationKey: ["hr", "custom-fields", "delete"],
    mutationFn: (id) =>
      apiClient.delete<void>(`/hr/custom-fields/definitions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: cfDefsKey(entityType) }),
  });
}
