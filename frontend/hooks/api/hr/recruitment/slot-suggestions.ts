"use client";

import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { SuggestedSlots } from "@/hooks/api/hr/recruitment/slot-suggestions-schema";

export type { SuggestedSlots };

const suggestedSlotsC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/slot-suggestions-schema").then(
    (m) => m.suggestedSlotsContract,
  ),
);

export interface SuggestSlotsInput {
  panelUserIds: string[];
  from: string;
  to: string;
  durationMinutes?: number;
  granularityMinutes?: number;
  limit?: number;
  ignoreInterviewId?: number;
}

export function useSuggestSlots() {
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "interviews", "suggest-slots"],
    mutationFn: (input: SuggestSlotsInput) =>
      apiClient.post<SuggestedSlots>(
        "/hr/recruitment/interviews/suggest-slots",
        input,
        undefined,
        suggestedSlotsC,
      ),
  });
}
