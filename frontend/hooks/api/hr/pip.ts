"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface PIP {
  id: number;
  userId: string;
  managerId: string;
  hrRepId: string | null;
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
  hrRep?: { id: string; name: string | null } | null;
}

const pipKeys = { all: [...queryKeys.hr.all, "pip"] as const, list: () => [...pipKeys.all, "list"] as const };

export function usePIPs() {
  const canView = useCan("hr:performance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({ queryKey: pipKeys.list(), queryFn: () => apiClient.get<PIP[]>("/hr/performance/pip"), staleTime: 2 * 60_000, enabled: canView && hrEnabled });
}

export function useCreatePIP() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "pip", "create"],
    mutationFn: (data: { userId: string; hrRepId?: string; reason: string; objectives: { objective: string; metric: string; deadline: string }[]; startDate: string; endDate: string; notes?: string }) =>
      apiClient.post<PIP>("/hr/performance/pip", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: pipKeys.list() }),
  });
}

export function useUpdatePIP() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "pip", "update"],
    mutationFn: ({ id, ...data }: { id: number; status?: string; outcome?: string; notes?: string; reason?: string; objectives?: { objective: string; metric: string; deadline: string }[]; endDate?: string; hrRepId?: string | null }) =>
      apiClient.patch<{ success: boolean }>(`/hr/performance/pip/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: pipKeys.list() }),
  });
}
