"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const talentPoolListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/talent-pools-schema").then((m) => m.talentPoolListContract),
);
const talentPoolRowC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/talent-pools-schema").then((m) => m.talentPoolRowContract),
);
const talentPoolMembersPageC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/talent-pools-schema").then(
    (m) => m.talentPoolMembersPageContract,
  ),
);
const talentPoolMemberRowC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/talent-pools-schema").then(
    (m) => m.talentPoolMemberRowContract,
  ),
);

export interface TalentPool {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  memberCount: number;
}

export interface TalentPoolRow {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TalentPoolMemberRow {
  id: number;
  poolId: number;
  candidateId: number;
  orgId: string;
  notes: string | null;
  addedBy: string | null;
  addedAt: string;
}

export interface TalentPoolMember {
  membershipId: number;
  notes: string | null;
  addedAt: string;
  candidateId: number;
  firstName: string;
  lastName: string;
  email: string;
  currentCompany: string | null;
  currentRole: string | null;
  status: string;
}

export interface PaginatedPoolMembers {
  data: TalentPoolMember[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

interface PoolMembersParams {
  cursor?: string;
  limit?: number;
}

const poolsKey = humanResourcesQueryKeys.hr.talentPools();
const poolMembersKey = (poolId: number) => ["hr", "talentPools", poolId, "members"] as const;

export function useTalentPools() {
  const canRequisitions = useCan("hr:requisitions:view");
  return useQuery({
    queryKey: poolsKey,
    queryFn: ({ signal }) =>
      apiClient.get<TalentPool[]>("/hr/recruitment/talent-pools", undefined, signal, talentPoolListC),
    staleTime: 60_000,
    enabled: canRequisitions,
  });
}

export function useCreateTalentPool() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "talent-pools", "create"],
    mutationFn: (data: { name: string; description?: string }) =>
      apiClient.post<TalentPoolRow>("/hr/recruitment/talent-pools", data, undefined, talentPoolRowC),
    onSuccess: () => qc.invalidateQueries({ queryKey: poolsKey }),
  });
}

export function useDeleteTalentPool() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "talent-pools", "delete"],
    mutationFn: (poolId: number) =>
      apiClient.delete<void>(
        `/hr/recruitment/talent-pools/${poolId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: poolsKey }),
  });
}

export function usePoolMembers(poolId: number, params?: PoolMembersParams) {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: [...humanResourcesQueryKeys.hr.hrTalentPoolMembersAll(poolId), params] as const,
    queryFn: ({ signal }) => {
      const search: { cursor?: string; limit?: number } = {};
      if (params?.cursor) search.cursor = params.cursor;
      if (params?.limit) search.limit = params.limit;
      return apiClient.get<PaginatedPoolMembers>(
        `/hr/recruitment/talent-pools/${poolId}/members`,
        search,
        signal,
        talentPoolMembersPageC,
      );
    },
    staleTime: 60_000,
    enabled: !!poolId,
    placeholderData: keepPreviousData,
  });
}

export function useAddPoolMember(poolId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "talent-pools", "add-member", poolId],
    mutationFn: (data: { candidateId: number; notes?: string }) =>
      apiClient.post<TalentPoolMemberRow>(
        `/hr/recruitment/talent-pools/${poolId}/members`,
        data,
        undefined,
        talentPoolMemberRowC,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: poolMembersKey(poolId) });
      void qc.invalidateQueries({ queryKey: poolsKey });
    },
  });
}

export function useRemovePoolMember(poolId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "talent-pools", "remove-member", poolId],
    mutationFn: (candidateId: number) =>
      apiClient.delete<void>(
        `/hr/recruitment/talent-pools/${poolId}/members/${candidateId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: poolMembersKey(poolId) });
      void qc.invalidateQueries({ queryKey: poolsKey });
    },
  });
}
