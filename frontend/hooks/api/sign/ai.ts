"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export function useSummarizeEnvelope(envelopeId: number) {
  return useAuthorizedMutation("sign:envelope:view", {
    mutationKey: ["signEnvelopes", "ai", "summarize", envelopeId],
    mutationFn: () =>
      apiClient.post<{ summary: string }>(`/sign/envelopes/${envelopeId}/ai/summarize`),
  });
}
