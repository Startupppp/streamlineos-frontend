"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

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
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface PoolMembersParams {
  page?: number;
  limit?: number;
}

const poolsKey = queryKeys.hr.talentPools();
const poolMembersKey = (poolId: number) => ["hr", "talentPools", poolId, "members"] as const;

export function useTalentPools() {
  const canEmployees = useCan("hr:employees:view");
  return useQuery({
    queryKey: poolsKey,
    queryFn: () => apiClient.get<TalentPool[]>("/hr/recruitment/talent-pools"),
    staleTime: 60_000,
    enabled: canEmployees,
  });
}

export function useCreateTalentPool() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "talent-pools", "create"],
    mutationFn: (data: { name: string; description?: string }) =>
      apiClient.post<TalentPool>("/hr/recruitment/talent-pools", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: poolsKey }),
  });
}

export function useDeleteTalentPool() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "recruitment", "talent-pools", "delete"],
    mutationFn: (poolId: number) => apiClient.delete<{ success: boolean }>(`/hr/recruitment/talent-pools/${poolId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: poolsKey }),
  });
}

export function usePoolMembers(poolId: number, params?: PoolMembersParams) {
  return useQuery({
    queryKey: [...poolMembersKey(poolId), params] as const,
    queryFn: () => {
      const search = new URLSearchParams();
      if (params?.page) search.set("page", String(params.page));
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
  return useMutation({
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
  return useMutation({
    mutationKey: ["hr", "recruitment", "talent-pools", "remove-member", poolId],
    mutationFn: (candidateId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/talent-pools/${poolId}/members/${candidateId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: poolMembersKey(poolId) });
      void qc.invalidateQueries({ queryKey: poolsKey });
    },
  });
}
