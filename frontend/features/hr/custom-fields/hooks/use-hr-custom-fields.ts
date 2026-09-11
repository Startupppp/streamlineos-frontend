"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import type {
  CreateCustomFieldPayload,
  HrCustomFieldDefinition,
  UpdateCustomFieldPayload,
} from "@/features/hr/forms/lib/types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const fieldDefListContract = lazyContract(() =>
  import("@/features/hr/custom-fields/hooks/hr-custom-fields-schema").then((m) => m.hrFieldDefListContract),
);
const fieldDefRowContract = lazyContract(() =>
  import("@/features/hr/custom-fields/hooks/hr-custom-fields-schema").then((m) => m.hrFieldDefContract),
);
const fieldDefDeleteContract = lazyContract(() =>
  import("@/features/hr/custom-fields/hooks/hr-custom-fields-schema").then((m) => m.hrFieldDefDeleteContract),
);

function cfDefsKey(entityType: string) {
  return ["hr", "custom-fields", "definitions", entityType] as const;
}

export function useHrCustomFields(
  entityType: string = "employee",
  options?: { enabled?: boolean },
) {
  const canManage = useCan("hr:custom-fields:manage");
  return useQuery<HrCustomFieldDefinition[]>({
    queryKey: cfDefsKey(entityType),
    queryFn: ({ signal }) =>
      apiClient.get("/hr/custom-fields/definitions", { entityType }, signal, fieldDefListContract),
    staleTime: 60_000,
    enabled: canManage && (options?.enabled ?? true),
  });
}

export function useCreateCustomField(entityType: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation<HrCustomFieldDefinition, Error, CreateCustomFieldPayload>("hr:custom-fields:manage", {
    mutationKey: ["hr", "custom-fields", "create"],
    mutationFn: (payload) =>
      apiClient.post("/hr/custom-fields/definitions", payload, undefined, fieldDefRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: cfDefsKey(entityType) }),
  });
}

export function useUpdateCustomField(entityType: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation<HrCustomFieldDefinition, Error, { id: number; payload: UpdateCustomFieldPayload }>("hr:custom-fields:manage", {
    mutationKey: ["hr", "custom-fields", "update"],
    mutationFn: ({ id, payload }) =>
      apiClient.patch(`/hr/custom-fields/definitions/${id}`, payload, undefined, fieldDefRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: cfDefsKey(entityType) }),
  });
}

export function useDeleteCustomField(entityType: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("hr:custom-fields:manage", {
    mutationKey: ["hr", "custom-fields", "delete"],
    mutationFn: (id) =>
      apiClient.delete(`/hr/custom-fields/definitions/${id}`, undefined, undefined, fieldDefDeleteContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: cfDefsKey(entityType) }),
  });
}
