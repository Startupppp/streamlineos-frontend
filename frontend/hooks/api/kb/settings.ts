"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type KbSettings = {
  trashRetentionDays: number;
};

export function useKbSettings() {
  const canManageSettings = useCan("kb:settings:manage");
  return useQuery({
    queryKey: queryKeys.kb.settings(),
    queryFn: ({ signal }) => apiClient.get<KbSettings>("/kb/settings", undefined, signal),
    staleTime: 300_000,
    enabled: canManageSettings,
  });
}

export function useUpdateKbSettings() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:settings:manage", {
    mutationKey: ["kb", "settings", "update"],
    mutationFn: (data: Partial<KbSettings>) =>
      apiClient.patch<KbSettings>("/kb/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.settings() });
    },
  });
}
