"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface BackgroundVerification {
  id: number;
  userId: string;
  type: string;
  status: string | null;
  provider: string | null;
  referenceNumber: string | null;
  result: string | null;
  notes: string | null;
  completedAt: Date | string | null;
  createdAt: Date | string | null;
  user?: { id: string; name: string | null; email: string } | null;
}

const bgvKeys = {
  all: [...humanResourcesQueryKeys.hr.all, "bgv"] as const,
  list: () => [...bgvKeys.all, "list"] as const,
};

export function useBackgroundVerifications() {
  const canView = useCan("hr:sensitive:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: bgvKeys.list(),
    queryFn: ({ signal }) => apiClient.get<BackgroundVerification[]>("/hr/background-verification", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateBackgroundVerification() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:sensitive:manage", {
    mutationKey: ["hr", "background-verification", "create"],
    mutationFn: (data: { userId: string; type: string; provider?: string; referenceNumber?: string; notes?: string }) =>
      apiClient.post<BackgroundVerification>("/hr/background-verification", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bgvKeys.list() }),
  });
}

export function useUpdateBackgroundVerification() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:sensitive:manage", {
    mutationKey: ["hr", "background-verification", "update"],
    mutationFn: (data: { id: number; status?: string; result?: string; notes?: string }) =>
      apiClient.patch<{ success: boolean }>("/hr/background-verification", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bgvKeys.list() }),
  });
}
