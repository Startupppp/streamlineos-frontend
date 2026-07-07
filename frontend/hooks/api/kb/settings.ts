"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type KbSettings = {
  trashRetentionDays: number;
};

export function useKbSettings() {
  return useQuery({
    queryKey: queryKeys.kb.settings(),
    queryFn: () => apiClient.get<KbSettings>("/kb/settings"),
    staleTime: 300_000,
  });
}

export function useUpdateKbSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "settings", "update"],
    mutationFn: (data: Partial<KbSettings>) =>
      apiClient.patch<KbSettings>("/kb/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.settings() });
    },
  });
}
