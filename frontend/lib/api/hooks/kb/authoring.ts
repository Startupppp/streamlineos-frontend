"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  KbAiContent,
  KbAiDraftInput,
  KbAiImproveInput,
  KbAiSummarizeInput,
  KbAiTranslateInput,
} from "@/types/kb";

export function useKbAiDraft() {
  return useMutation({
    mutationFn: (input: KbAiDraftInput) => apiClient.post<KbAiContent>("/kb/ai/draft", input),
  });
}

export function useKbAiImprove() {
  return useMutation({
    mutationFn: (input: KbAiImproveInput) => apiClient.post<KbAiContent>("/kb/ai/improve", input),
  });
}

export function useKbAiSummarize() {
  return useMutation({
    mutationFn: (input: KbAiSummarizeInput) => apiClient.post<KbAiContent>("/kb/ai/summarize", input),
  });
}

export function useKbAiTranslate() {
  return useMutation({
    mutationFn: (input: KbAiTranslateInput) => apiClient.post<KbAiContent>("/kb/ai/translate", input),
  });
}
