"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface PlatformAdmin {
  id: string;
  email: string;
  name: string | null;
}

export function usePlatformAdmins() {
  return useQuery({
    queryKey: queryKeys.platform.admins(),
    queryFn: () => apiClient.get<PlatformAdmin[]>("/platform/admins"),
    staleTime: 30_000,
  });
}

export function useAddPlatformAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["platform", "admins", "add"],
    mutationFn: (payload: { email: string }) =>
      apiClient.post<PlatformAdmin>("/platform/admins", payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.platform.admins() });
    },
  });
}

export function useRemovePlatformAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["platform", "admins", "remove"],
    mutationFn: (userId: string) =>
      apiClient.delete<{ ok: true }>(`/platform/admins/${userId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.platform.admins() });
    },
  });
}
