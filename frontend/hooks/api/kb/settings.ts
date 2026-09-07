"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type KbSettings = {
  trashRetentionDays: number;
};

const kbSettingsContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-spaces-settings-schema").then((m) => m.kbSettingsContract),
);

export function useKbSettings() {
  const canManageSettings = useCan("kb:settings:manage");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.settings(),
    queryFn: ({ signal }) => apiClient.get<KbSettings>("/kb/settings", undefined, signal, kbSettingsContract),
    staleTime: 300_000,
    enabled: canManageSettings,
  });
}

export function useUpdateKbSettings() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:settings:manage", {
    mutationKey: ["kb", "settings", "update"],
    mutationFn: (data: Partial<KbSettings>) =>
      apiClient.patch<KbSettings>("/kb/settings", data, undefined, kbSettingsContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.settings() });
    },
  });
}
