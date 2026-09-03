"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { KbAskInput, KbAskResponse, KbAiFeedbackInput } from "@/types/kb";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiAbortInput } from "@/hooks/api/ai-abort";

export function useKbAsk() {
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "ask"],
    mutationFn: ({ signal, ...input }: KbAskInput & AiAbortInput) =>
      apiClient.post<KbAskResponse>("/kb/ask", input, { signal }),
  });
}

export function useKbAiAnswerFeedback() {
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "ai-feedback"],
    mutationFn: (input: KbAiFeedbackInput) =>
      apiClient.post<{ success: boolean }>("/kb/ai/feedback", input),
  });
}
