"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { z } from "zod";
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

// PATCH …/members/:membershipRowId (MP-B-015). Inline until the generated
// contracts are regenerated for the new route.
const memberRoleSchema = z.object({ id: z.number().int(), role: z.enum(["member", "admin"]) });

type MemberRole = z.infer<typeof memberRoleSchema>["role"];

/** Rewrite every cached members page (first page and cursor pages) of one product. */
function patchMemberPages(
  qc: QueryClient,
  managedProductId: number,
  patch: (rows: ManagedProductMember[]) => ManagedProductMember[],
) {
  qc.setQueriesData<ManagedProductMembersResponse>(
    { queryKey: buildWorkQueryKeys.projects.managedProducts.members(managedProductId) },
    (old) => (old ? { ...old, data: patch(old.data) } : old),
  );
}

/** Later cursor pages shift after an add or remove; mark them stale without refetching now. */
function markMemberPagesStale(qc: QueryClient, managedProductId: number) {
  void qc.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.managedProducts.members(managedProductId),
    refetchType: "none",
  });
}

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
    onSuccess: (row) => {
      // The response is the full row: show it on the first page now (MP-B-025).
      qc.setQueryData<ManagedProductMembersResponse>(
        buildWorkQueryKeys.projects.managedProducts.members(managedProductId),
        (old) =>
          old && !old.data.some((m) => m.id === row.id)
            ? { ...old, data: [row, ...old.data] }
            : old,
      );
      markMemberPagesStale(qc, managedProductId);
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
    // Removed on success, not on mutate: the last admin or the owner is a
    // 409 and must stay listed (MP-B-025).
    onSuccess: (_void, membershipRowId) => {
      patchMemberPages(qc, managedProductId, (rows) =>
        rows.filter((m) => m.id !== membershipRowId),
      );
      markMemberPagesStale(qc, managedProductId);
    },
  });
}

interface UpdateMemberRoleVariables {
  membershipRowId: number;
  role: MemberRole;
}

interface UpdateMemberRoleContext {
  previousRole: MemberRole | undefined;
}

export function useUpdateManagedProductMemberRole(managedProductId: number) {
  const qc = useQueryClient();
  const setRole = (membershipRowId: number, role: MemberRole) =>
    patchMemberPages(qc, managedProductId, (rows) =>
      rows.map((m) => (m.id === membershipRowId ? { ...m, role } : m)),
    );
  return useAuthorizedMutation<
    z.infer<typeof memberRoleSchema>,
    Error,
    UpdateMemberRoleVariables,
    UpdateMemberRoleContext
  >("build:managed-products:update", {
    mutationKey: ["projects", "managed-products", managedProductId, "members", "role"],
    mutationFn: ({ membershipRowId, role }) =>
      apiClient.patch<z.infer<typeof memberRoleSchema>>(
        `/build/managed-products/${managedProductId}/members/${membershipRowId}`,
        { role },
        undefined,
        memberRoleSchema,
      ),
    onMutate: async ({ membershipRowId, role }) => {
      const key = buildWorkQueryKeys.projects.managedProducts.members(managedProductId);
      await qc.cancelQueries({ queryKey: key });
      const previousRole = qc
        .getQueriesData<ManagedProductMembersResponse>({ queryKey: key })
        .flatMap(([, page]) => page?.data ?? [])
        .find((m) => m.id === membershipRowId)?.role;
      setRole(membershipRowId, role);
      return { previousRole };
    },
    onError: (_error, { membershipRowId }, context) => {
      if (context?.previousRole) setRole(membershipRowId, context.previousRole);
    },
    onSuccess: (data) => setRole(data.id, data.role),
  });
}
