"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useSummarizeEnvelope(envelopeId: number) {
  return useMutation({
    mutationKey: ["signEnvelopes", "ai", "summarize", envelopeId],
    mutationFn: () =>
      apiClient.post<{ summary: string }>(`/sign/envelopes/${envelopeId}/ai/summarize`),
  });
}
