"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type SuccessionReadiness = "ready_now" | "1_2_years" | "3_plus";

export interface SuccessionPlan {
  id: number;
  orgId: string;
  roleName: string;
  jobRoleId: number | null;
  incumbentId: string | null;
  successorId: string;
  readiness: SuccessionReadiness;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const keys = {
  list: () => ["hr", "succession", "list"] as const,
};

export function useSuccessionPlans() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: () => apiClient.get<SuccessionPlan[]>("/hr/succession"),
    staleTime: 60_000,
  });
}

export function useCreateSuccessionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "succession", "create"],
    mutationFn: (body: Omit<SuccessionPlan, "id" | "orgId" | "createdBy" | "createdAt" | "updatedAt">) =>
      apiClient.post<SuccessionPlan>("/hr/succession", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list() }),
  });
}

export function useUpdateSuccessionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "succession", "update"],
    mutationFn: ({ id, ...body }: Partial<SuccessionPlan> & { id: number }) =>
      apiClient.patch<SuccessionPlan>(`/hr/succession/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list() }),
  });
}

export function useDeleteSuccessionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "succession", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/succession/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list() }),
  });
}
