"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
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

interface SuccessionPage {
  items: SuccessionPlan[];
  nextCursor: string | null;
}

const keys = {
  list: () => ["hr", "succession", "list"] as const,
};

export function useSuccessionPlans() {
  return useInfiniteQuery({
    queryKey: keys.list(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "30" });
      if (pageParam) params.set("cursor", pageParam);
      return apiClient.get<SuccessionPage>(`/hr/succession?${params}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 60_000,
  });
}

export function useCreateSuccessionPlan() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:succession:manage", {
    mutationKey: ["hr", "succession", "create"],
    mutationFn: (body: Omit<SuccessionPlan, "id" | "orgId" | "createdBy" | "createdAt" | "updatedAt">) =>
      apiClient.post<SuccessionPlan>("/hr/succession", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list() }),
  });
}

export function useDeleteSuccessionPlan() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:succession:manage", {
    mutationKey: ["hr", "succession", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/succession/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list() }),
  });
}
