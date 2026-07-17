"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

type ArticleAiTextResult = { text: string };

export function useKbArticleSummarize(articleId: number) {
  return useMutation({
    mutationKey: ["kb", "articles", articleId, "ai", "summarize"],
    mutationFn: () => apiClient.post<ArticleAiTextResult>(`/kb/articles/${articleId}/ai/summarize`, {}),
  });
}

export function useKbArticleAsk(articleId: number) {
  return useMutation({
    mutationKey: ["kb", "articles", articleId, "ai", "ask"],
    mutationFn: (question: string) =>
      apiClient.post<ArticleAiTextResult>(`/kb/articles/${articleId}/ai/ask`, { question }),
  });
}

export function useKbArticleImprove(articleId: number) {
  return useMutation({
    mutationKey: ["kb", "articles", articleId, "ai", "improve"],
    mutationFn: () => apiClient.post<ArticleAiTextResult>(`/kb/articles/${articleId}/ai/improve`, {}),
  });
}

export function useKbArticleSuggestRelated(articleId: number) {
  return useMutation({
    mutationKey: ["kb", "articles", articleId, "ai", "suggest-related"],
    mutationFn: () =>
      apiClient.post<ArticleAiTextResult>(`/kb/articles/${articleId}/ai/suggest-related`, {}),
  });
}
