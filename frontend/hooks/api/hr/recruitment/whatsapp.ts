"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { WhatsappState } from "@/hooks/api/hr/recruitment/whatsapp-schema";

export type { WhatsappState };

const stateC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/whatsapp-schema").then((m) => m.whatsappStateContract),
);

export function useCandidateWhatsapp(candidateId: number) {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: humanResourcesQueryKeys.hr.candidateWhatsapp(candidateId),
    queryFn: ({ signal }) =>
      apiClient.get<WhatsappState>(
        `/hr/recruitment/candidates/${candidateId}/whatsapp`,
        undefined,
        signal,
        stateC,
      ),
    staleTime: 60_000,
  });
}

export function useRecordWhatsappConsent(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "candidates", candidateId, "whatsapp", "consent"],
    mutationFn: (optedIn: boolean) =>
      apiClient.put<WhatsappState>(
        `/hr/recruitment/candidates/${candidateId}/whatsapp/consent`,
        { optedIn },
        undefined,
        stateC,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidateWhatsapp(candidateId) }),
  });
}
