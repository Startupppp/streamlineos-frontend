"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface TalentPool {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  createdAt: string;
  memberCount: number;
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

const poolsKey = queryKeys.hr.talentPools();
const poolMembersKey = (poolId: number) => ["hr", "talentPools", poolId, "members"] as const;

export function useTalentPools() {
  const canEmployees = useCan("hr:employees:view");
  return useQuery({
    queryKey: poolsKey,
    queryFn: ({ signal }) => apiClient.get<TalentPool[]>("/hr/recruitment/talent-pools", undefined, signal),
    staleTime: 60_000,
    enabled: canEmployees,
  });
}

export function useCreateTalentPool() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "talent-pools", "create"],
    mutationFn: (data: { name: string; description?: string }) =>
      apiClient.post<TalentPool>("/hr/recruitment/talent-pools", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: poolsKey }),
  });
}

export function useDeleteTalentPool() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "talent-pools", "delete"],
    mutationFn: (poolId: number) => apiClient.delete<{ success: boolean }>(`/hr/recruitment/talent-pools/${poolId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: poolsKey }),
  });
}

export function usePoolMembers(poolId: number, params?: PoolMembersParams) {
  return useQuery({
    queryKey: [...queryKeys.hr.hrTalentPoolMembersAll(poolId), params] as const,
    queryFn: () => {
      const search = new URLSearchParams();
      if (params?.cursor) search.set("cursor", params.cursor);
      if (params?.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      return apiClient.get<PaginatedPoolMembers>(`/hr/recruitment/talent-pools/${poolId}/members${qs ? `?${qs}` : ""}`);
    },
    staleTime: 60_000,
    enabled: !!poolId,
    placeholderData: keepPreviousData,
  });
}

export function useAddPoolMember(poolId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "talent-pools", "add-member", poolId],
    mutationFn: (data: { candidateId: number; notes?: string }) =>
      apiClient.post(`/hr/recruitment/talent-pools/${poolId}/members`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: poolMembersKey(poolId) });
      void qc.invalidateQueries({ queryKey: poolsKey });
    },
  });
}

export function useRemovePoolMember(poolId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "talent-pools", "remove-member", poolId],
    mutationFn: (candidateId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/talent-pools/${poolId}/members/${candidateId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: poolMembersKey(poolId) });
      void qc.invalidateQueries({ queryKey: poolsKey });
    },
  });
}
