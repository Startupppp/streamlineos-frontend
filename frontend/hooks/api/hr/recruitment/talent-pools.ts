"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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

const poolsKey = ["hr", "talentPools"] as const;
const poolMembersKey = (poolId: number) => ["hr", "talentPools", poolId, "members"] as const;

export function useTalentPools() {
  return useQuery({
    queryKey: poolsKey,
    queryFn: () => apiClient.get<TalentPool[]>("/hr/recruitment/talent-pools"),
    staleTime: 60_000,
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

export function usePoolMembers(poolId: number) {
  return useQuery({
    queryKey: poolMembersKey(poolId),
    queryFn: () => apiClient.get<TalentPoolMember[]>(`/hr/recruitment/talent-pools/${poolId}/members`),
    staleTime: 60_000,
    enabled: !!poolId,
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
