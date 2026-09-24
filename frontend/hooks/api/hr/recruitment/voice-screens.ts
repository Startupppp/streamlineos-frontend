"use client";

import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { VoiceScreenView } from "@/hooks/api/hr/recruitment/voice-screens-schema";

export type { VoiceScreenView };

const listC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/voice-screens-schema").then((m) => m.voiceScreenListContract),
);

/**
 * Read-only from this side for now.
 *
 * Requesting a screen needs the candidate's consent to an automated call and a
 * script, and there is no vendor on this deployment to place one — so the
 * screen shows what exists and what connecting a vendor would need, rather than
 * a request form whose submit would always refuse.
 */
export function useCandidateVoiceScreens(candidateId: number) {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: ["hr", "recruitment", "candidates", candidateId, "voice-screens"] as const,
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
