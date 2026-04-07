"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface PIP {
  id: number;
  userId: string;
  managerId: string;
  reason: string;
  objectives: { objective: string; metric: string; deadline: string }[] | null;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "EXTENDED" | "COMPLETED" | "TERMINATED" | null;
  outcome: string | null;
  notes: string | null;
  createdAt: Date | string | null;
  user?: { id: string; name: string | null; image: string | null } | null;
  manager?: { id: string; name: string | null } | null;
}

const pipKeys = { all: [...queryKeys.hr.all, "pip"] as const, list: () => [...pipKeys.all, "list"] as const };

export function usePIPs() {
  return useQuery({ queryKey: pipKeys.list(), queryFn: () => apiClient.get<PIP[]>("/hr/performance/pip") });
}

export function useCreatePIP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; reason: string; objectives: { objective: string; metric: string; deadline: string }[]; startDate: string; endDate: string; notes?: string }) =>
      apiClient.post<PIP>("/hr/performance/pip", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: pipKeys.list() }),
  });
}

export function useUpdatePIP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; status?: string; outcome?: string; notes?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/performance/pip/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: pipKeys.list() }),
  });
}
