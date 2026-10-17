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
  /** Interviewer user ids, as every picker on this side lists them. */
  panelUserIds: string[];
  from: string;
  to: string;
  durationMinutes?: number;
  granularityMinutes?: number;
  limit?: number;
  ignoreInterviewId?: number;
}

/**
 * A mutation rather than a query, matching the route.
 *
 * The endpoint is a POST because the panel is a list, and a list in a query
 * string is a convention nobody agrees on. It writes nothing, so there is no
 * cache to invalidate — the answer is a computation over a window the recruiter
 * just chose, and re-running it is the point.
 */
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
