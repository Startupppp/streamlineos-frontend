"use client";

import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { VoiceScreenView } from "@/hooks/api/hr/recruitment/voice-screens-schema";

export type { VoiceScreenView };

const listC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/voice-screens-schema").then((m) => m.voiceScreenListContract),
);

export function useCandidateVoiceScreens(candidateId: number) {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: humanResourcesQueryKeys.hr.candidateVoiceScreens(candidateId),
    queryFn: ({ signal }) =>
      apiClient.get<VoiceScreenView[]>(
        `/hr/recruitment/candidates/${candidateId}/voice-screens`,
        undefined,
        signal,
        listC,
      ),
    staleTime: 60_000,
  });
}
