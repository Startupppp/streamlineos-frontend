"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  ManagedProductRelationsListMembersResponse,
  ManagedProductRelationsAddMemberResponse,
} from "@/contracts/build-contracts.generated";

export type ManagedProductMember =
  ManagedProductRelationsListMembersResponse["data"][number];
export type ManagedProductMembersResponse = ManagedProductRelationsListMembersResponse;

export interface AddManagedProductMemberInput {
  organizationMembershipId: number;
  role: "member" | "admin";
}

const membersPageContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductRelationsListMembersResponseSchema,
  ),
);

const addMemberContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductRelationsAddMemberResponseSchema,
  ),
);

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export function useManagedProductMembers(
  managedProductId: number,
  options?: Pick<UseQueryOptions<ManagedProductMembersResponse>, "enabled">,
) {
  const canView = useCan("build:managed-products:view");
  return useQuery<ManagedProductMembersResponse>({
    queryKey: buildWorkQueryKeys.projects.managedProducts.members(managedProductId),
    queryFn: ({ signal }) =>
      apiClient.get<ManagedProductMembersResponse>(
        `/build/managed-products/${managedProductId}/members`,
        undefined,
        signal,
        membersPageContract,
      ),
    enabled: canView && managedProductId > 0 && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useAddManagedProductMember(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "members", "add"],
    mutationFn: (data: AddManagedProductMemberInput) =>
      apiClient.post<ManagedProductRelationsAddMemberResponse>(
        `/build/managed-products/${managedProductId}/members`,
        data,
        undefined,
        addMemberContract,
      ),
    onSuccess: (added) => {
      qc.setQueryData<ManagedProductMembersResponse>(
        buildWorkQueryKeys.projects.managedProducts.members(managedProductId),
        (prev) => {
          if (!prev) return { data: [added] };
          return { ...prev, data: [...prev.data, added] };
        },
      );
    },
  });
}

export function useRemoveManagedProductMember(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "members", "remove"],
    mutationFn: (membershipRowId: number) =>
      apiClient.delete<void>(
        `/build/managed-products/${managedProductId}/members/${membershipRowId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: (_data, membershipRowId) => {
      qc.setQueryData<ManagedProductMembersResponse>(
        buildWorkQueryKeys.projects.managedProducts.members(managedProductId),
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.filter((m) => m.id !== membershipRowId),
          };
        },
      );
    },
  });
}
