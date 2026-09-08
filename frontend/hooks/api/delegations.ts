"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

const delegationsPageContract = lazyContract(() =>
  import("@/hooks/api/delegations-schema").then((m) => m.delegationsPageContract),
);
const delegationRowContract = lazyContract(() =>
  import("@/hooks/api/delegations-schema").then((m) => m.delegationRowContract),
);
export interface Delegation {
  id: string;
  orgId: string;
  delegatorMembershipId: number;
  delegateeMembershipId: number;
  delegatorName?: string | null;
  delegateeName?: string | null;
  permissions: string[];
  startsAt: string;
  endsAt: string | null;
  reason: string | null;
  status: string;
  lifecycle: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "REVOKED";
  createdAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
}

export interface DelegationPage {
  data: Delegation[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface DelegationListParams {
  limit: number;
  search: string;
  cursor?: string;
}

export interface GrantDelegationInput {
  delegateeId: string;
  permissions: string[];
  startsAt: string;
  endsAt: string;
  reason?: string;
}

export function useReceivedDelegations(params: DelegationListParams) {
  return useGatedQuery<DelegationPage>("settings:rbac:manage", {
    queryKey: supportAndWorkflowsQueryKeys.delegations.received(params),
    queryFn: ({ signal }) => {
      const urlParams = new URLSearchParams({ limit: String(params.limit) });
      if (params.cursor) urlParams.set("cursor", params.cursor);
      if (params.search) urlParams.set("search", params.search);
      return apiClient.get<DelegationPage>(
        `/access/delegations?${urlParams.toString()}`,
        undefined,
        signal,
        delegationsPageContract,
      );
    },
    staleTime: 60_000,
  });
}

export function useGrantedDelegations(params: DelegationListParams) {
  return useGatedQuery<DelegationPage>("settings:rbac:manage", {
    queryKey: supportAndWorkflowsQueryKeys.delegations.given(params),
    queryFn: ({ signal }) => {
      const urlParams = new URLSearchParams({ limit: String(params.limit) });
      if (params.cursor) urlParams.set("cursor", params.cursor);
      if (params.search) urlParams.set("search", params.search);
      return apiClient.get<DelegationPage>(
        `/access/delegations/given?${urlParams.toString()}`,
        undefined,
        signal,
        delegationsPageContract,
      );
    },
    staleTime: 60_000,
  });
}

export function useRevokeDelegation(
  options?: Omit<
    UseMutationOptions<unknown, Error, string>,
    "mutationKey" | "mutationFn"
  >,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, string>("settings:rbac:manage", {
    mutationKey: [...supportAndWorkflowsQueryKeys.delegations.all, "revoke"],
    mutationFn: (id: string) => apiClient.delete<void>(`/access/delegations/${id}`, undefined, undefined, noContentC),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({
        queryKey: supportAndWorkflowsQueryKeys.delegations.all,
      });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useGrantDelegation(
  options?: Omit<
    UseMutationOptions<unknown, Error, GrantDelegationInput>,
    "mutationKey" | "mutationFn"
  >,
) {
  return useAuthorizedMutation<unknown, Error, GrantDelegationInput>("settings:rbac:manage", {
    mutationKey: ["delegations", "grant"],
    mutationFn: (values: GrantDelegationInput) =>
      apiClient.post("/access/delegations", {
        delegateeId: values.delegateeId,
        permissions: values.permissions,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        reason: values.reason || undefined,
      }, undefined, delegationRowContract),
    ...options,
  });
}
