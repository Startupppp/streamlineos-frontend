"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const supportCustomFieldListContract = lazyContract(() =>
  import("@/hooks/api/support/support-channel-schema").then((m) => m.supportCustomFieldListContract),
);
const supportCustomFieldContract = lazyContract(() =>
  import("@/hooks/api/support/support-channel-schema").then((m) => m.supportCustomFieldContract),
);
const channelSuccessContract = lazyContract(() =>
  import("@/hooks/api/support/support-channel-schema").then((m) => m.channelSuccessContract),
);

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
  return useGatedQuery("support:tickets:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportCustomFields.list(activeOnly),
    queryFn: ({ signal }) =>
      apiClient.get("/support/custom-fields", activeOnly ? { activeOnly: "true" } : undefined, signal, supportCustomFieldListContract),
    staleTime: 60_000,
  });
}

export function usePortalActiveCustomFields() {
  return useGatedQuery("support:portal:tickets:create", {
    queryKey: supportAndWorkflowsQueryKeys.supportCustomFields.portalActive(),
    queryFn: ({ signal }) => apiClient.get("/support/portal/custom-fields", undefined, signal, supportCustomFieldListContract),
    staleTime: 60_000,
  });
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:settings:manage", {
    mutationKey: ["supportCustomFields", "create"] as const,
    mutationFn: (input: CreateCustomFieldInput) =>
      apiClient.post("/support/custom-fields", input, undefined, supportCustomFieldContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportCustomFields.all }),
  });
}

export function useUpdateCustomField() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:settings:manage", {
    mutationKey: ["supportCustomFields", "update"] as const,
    mutationFn: ({ id, input }: { id: number; input: UpdateCustomFieldInput }) =>
      apiClient.patch(`/support/custom-fields/${id}`, input, undefined, supportCustomFieldContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportCustomFields.all }),
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:settings:manage", {
    mutationKey: ["supportCustomFields", "delete"] as const,
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/support/custom-fields/${id}`, undefined, undefined, channelSuccessContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportCustomFields.all }),
  });
}
