"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiAbortInput } from "@/hooks/api/ai-abort";

type PageAiTextResult = { text: string; aiUsage?: AiUsageMeta | null };

export function useKbPageSummarize(pageId: number) {
  return useAuthorizedMutation<PageAiTextResult, Error, AiAbortInput | void>("kb:pages:view", {
    mutationKey: ["kb", "pages", pageId, "ai", "summarize"],
    mutationFn: (input) =>
      apiClient.post<PageAiTextResult>(`/kb/pages/${pageId}/ai/summarize`, {}, { signal: input?.signal }),
  });
}

export function useKbPageAsk(pageId: number) {
  return useAuthorizedMutation("kb:pages:view", {
    mutationKey: ["kb", "pages", pageId, "ai", "ask"],
    mutationFn: (question: string) =>
      apiClient.post<PageAiTextResult>(`/kb/pages/${pageId}/ai/ask`, { question }),
  });
}

export function useKbPageImprove(pageId: number) {
  return useAuthorizedMutation<PageAiTextResult, Error, AiAbortInput | void>("kb:pages:view", {
    mutationKey: ["kb", "pages", pageId, "ai", "improve"],
    mutationFn: (input) =>
      apiClient.post<PageAiTextResult>(`/kb/pages/${pageId}/ai/improve`, {}, { signal: input?.signal }),
  });
}

export function useKbPageSuggestRelated(pageId: number) {
  return useAuthorizedMutation<PageAiTextResult, Error, AiAbortInput | void>("kb:pages:view", {
    mutationKey: ["kb", "pages", pageId, "ai", "suggest-related"],
    mutationFn: (input) =>
      apiClient.post<PageAiTextResult>(`/kb/pages/${pageId}/ai/suggest-related`, {}, { signal: input?.signal }),
  });
}
