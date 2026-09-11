"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiAbortInput } from "@/hooks/api/ai-abort";

const signAiSummarizeContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signAiSummarizeContract),
);

export function useSummarizeEnvelope(envelopeId: number) {
  return useAuthorizedMutation<{ summary: string }, Error, AiAbortInput | void>(
    "sign:envelope:view",
    {
      mutationKey: ["signEnvelopes", "ai", "summarize", envelopeId],
      mutationFn: (input) =>
        apiClient.post<{ summary: string }>(
          `/sign/envelopes/${envelopeId}/ai/summarize`,
          undefined,
          { signal: input?.signal },
          signAiSummarizeContract,
        ),
    },
  );
}
