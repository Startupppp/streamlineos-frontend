"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { KbAskInput, KbAskResponse, KbAiFeedbackInput } from "@/types/kb";

export function useKbAsk() {
  return useMutation({
    mutationKey: ["kb", "ask"],
    mutationFn: (input: KbAskInput) => apiClient.post<KbAskResponse>("/kb/ask", input),
  });
}

export function useKbAiAnswerFeedback() {
  return useMutation({
    mutationKey: ["kb", "ai-feedback"],
    mutationFn: (input: KbAiFeedbackInput) =>
      apiClient.post<{ success: boolean }>("/kb/ai/feedback", input),
  });
}
