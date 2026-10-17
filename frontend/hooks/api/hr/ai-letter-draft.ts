"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { HrAiLetterType, LetterDraftResult } from "@/hooks/api/hr/ai-letter-draft-schema";

const letterDraftContract = lazyContract(() =>
  import("@/hooks/api/hr/ai-letter-draft-schema").then((m) => m.letterDraftContract),
);

export interface DraftHrLetterInput {
  userId: string;
  letterType: HrAiLetterType;
  details?: string;
}

export function useDraftHrLetter() {
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["ai", "hr", "letter-draft"],
    mutationFn: (input: DraftHrLetterInput) =>
      apiClient.post<LetterDraftResult>("/ai/hr/letter-draft", input, undefined, letterDraftContract),
  });
}
