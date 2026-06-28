"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ResourceGrant {
  id: string;
  orgId: string;
  resourceType: string;
  resourceId: string;
  principalType: "user" | "role";
  principalId: string;
  permissionKey: string;
  grantedBy: string | null;
  createdAt: string;
}

export interface GrantResourceInput {
  resourceType: string;
  resourceId: string;
  principalType: "user" | "role";
  principalId: string;
  permissionKey: string;
}

export function useResourceGrants(resourceType: string, resourceId: string) {
  return useQuery<ResourceGrant[], Error>({
    queryKey: queryKeys.access.resourceGrants(resourceType, resourceId),
    queryFn: () =>
      apiClient.get<ResourceGrant[]>(`/access/resource-grants`, {
        resourceType,
        resourceId,
      }),
    enabled: !!resourceType && !!resourceId,
    staleTime: 30_000,
  });
}

export function useGrantResource() {
  const qc = useQueryClient();
  return useMutation<ResourceGrant | null, Error, GrantResourceInput>({
    mutationFn: (input) =>
      apiClient.post<ResourceGrant | null>("/access/resource-grants", input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: queryKeys.access.resourceGrants(input.resourceType, input.resourceId),
      });
    },
  });
}

export function useRevokeGrant() {
  const qc = useQueryClient();
  return useMutation<
    { success: true },
    Error,
    { grantId: string; resourceType: string; resourceId: string }
  >({
    mutationFn: ({ grantId }) =>
      apiClient.delete<{ success: true }>(`/access/resource-grants/${grantId}`),
    onSuccess: (_data, { resourceType, resourceId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.access.resourceGrants(resourceType, resourceId),
      });
    },
  });
}
