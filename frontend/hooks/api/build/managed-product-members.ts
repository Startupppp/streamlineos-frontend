"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";
import type {
  ManagedProductRelationsListMembersResponse,
  ManagedProductRelationsAddMemberResponse,
} from "@/contracts/build-contracts.generated";

export type ManagedProductMember =
  ManagedProductRelationsListMembersResponse["data"][number];
export type ManagedProductMembersResponse =
  ManagedProductRelationsListMembersResponse;

export interface AddManagedProductMemberInput {
  organizationMembershipId: number;
  role: "member" | "admin";
}

const memberRowContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => {
    const row =
      m.managedProductRelationsListMembersResponseSchema.shape.data.element;
    return cursorPageContract(row);
  }),
);

const addMemberContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.managedProductRelationsAddMemberResponseSchema,
  ),
);

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export interface ManagedProductMembersOptions extends Pick<
  UseQueryOptions<ManagedProductMembersResponse>,
  "enabled"
> {
  cursor?: string;
}

export function useManagedProductMembers(
  managedProductId: number,
  options?: ManagedProductMembersOptions,
) {
  const canView = useCan("build:managed-products:view");
  const params: Record<string, string> = {};
  if (options?.cursor) params["cursor"] = options.cursor;
  const baseKey =
    buildWorkQueryKeys.projects.managedProducts.members(managedProductId);
  return useQuery<ManagedProductMembersResponse>({
    queryKey: options?.cursor ? [...baseKey, options.cursor] : baseKey,
    queryFn: ({ signal }) =>
      apiClient.get<ManagedProductMembersResponse>(
        `/build/managed-products/${managedProductId}/members`,
        Object.keys(params).length > 0 ? params : undefined,
        signal,
        memberRowContract,
      ),
    enabled: canView && managedProductId > 0 && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useAddManagedProductMember(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: [
      "projects",
      "managed-products",
      managedProductId,
      "members",
      "add",
    ],
    mutationFn: (data: AddManagedProductMemberInput) =>
      apiClient.post<ManagedProductRelationsAddMemberResponse>(
        `/build/managed-products/${managedProductId}/members`,
        data,
        undefined,
        addMemberContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey:
          buildWorkQueryKeys.projects.managedProducts.members(managedProductId),
        exact: false,
        refetchType: "active",
      });
    },
  });
}

export function useRemoveManagedProductMember(managedProductId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:managed-products:update", {
    mutationKey: [
      "projects",
      "managed-products",
      managedProductId,
      "members",
      "remove",
    ],
    mutationFn: (membershipRowId: number) =>
      apiClient.delete<void>(
        `/build/managed-products/${managedProductId}/members/${membershipRowId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey:
          buildWorkQueryKeys.projects.managedProducts.members(managedProductId),
        exact: false,
        refetchType: "active",
      });
    },
  });
}
