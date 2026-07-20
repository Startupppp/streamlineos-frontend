"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";

type PageAiTextResult = { text: string; aiUsage?: AiUsageMeta | null };

export function useKbPageSummarize(pageId: number) {
  return useMutation({
    mutationKey: ["kb", "pages", pageId, "ai", "summarize"],
    mutationFn: () => apiClient.post<PageAiTextResult>(`/kb/pages/${pageId}/ai/summarize`, {}),
  });
}

export function useKbPageAsk(pageId: number) {
  return useMutation({
    mutationKey: ["kb", "pages", pageId, "ai", "ask"],
    mutationFn: (question: string) =>
      apiClient.post<PageAiTextResult>(`/kb/pages/${pageId}/ai/ask`, { question }),
  });
}

export function useKbPageImprove(pageId: number) {
  return useMutation({
    mutationKey: ["kb", "pages", pageId, "ai", "improve"],
    mutationFn: () => apiClient.post<PageAiTextResult>(`/kb/pages/${pageId}/ai/improve`, {}),
  });
}

export function useKbPageSuggestRelated(pageId: number) {
  return useMutation({
    mutationKey: ["kb", "pages", pageId, "ai", "suggest-related"],
    mutationFn: () =>
      apiClient.post<PageAiTextResult>(`/kb/pages/${pageId}/ai/suggest-related`, {}),
  });
}
