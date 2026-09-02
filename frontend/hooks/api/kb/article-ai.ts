"use client";

import { apiClient } from "@/lib/api-client";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

type ArticleAiTextResult = { text: string; aiUsage?: AiUsageMeta | null };

export interface KbArticleAiInput {
  signal?: AbortSignal;
}

export interface KbArticleAskInput extends KbArticleAiInput {
  question: string;
}

export function useKbArticleSummarize(articleId: number) {
  return useAuthorizedMutation<ArticleAiTextResult, Error, KbArticleAiInput | void>(
    "kb:articles:view",
    {
      mutationKey: ["kb", "articles", articleId, "ai", "summarize"],
      mutationFn: (input) =>
        apiClient.post<ArticleAiTextResult>(
          `/kb/articles/${articleId}/ai/summarize`,
          {},
          { signal: input?.signal },
        ),
    },
  );
}

export function useKbArticleAsk(articleId: number) {
  return useAuthorizedMutation<ArticleAiTextResult, Error, KbArticleAskInput>(
    "kb:articles:view",
    {
      mutationKey: ["kb", "articles", articleId, "ai", "ask"],
      mutationFn: ({ question, signal }) =>
        apiClient.post<ArticleAiTextResult>(
          `/kb/articles/${articleId}/ai/ask`,
          { question },
          { signal },
        ),
    },
  );
}

export function useKbArticleImprove(articleId: number) {
  return useAuthorizedMutation<ArticleAiTextResult, Error, KbArticleAiInput | void>(
    "kb:articles:view",
    {
      mutationKey: ["kb", "articles", articleId, "ai", "improve"],
      mutationFn: (input) =>
        apiClient.post<ArticleAiTextResult>(
          `/kb/articles/${articleId}/ai/improve`,
          {},
          { signal: input?.signal },
        ),
    },
  );
}

export function useKbArticleSuggestRelated(articleId: number) {
  return useAuthorizedMutation<ArticleAiTextResult, Error, KbArticleAiInput | void>(
    "kb:articles:view",
    {
      mutationKey: ["kb", "articles", articleId, "ai", "suggest-related"],
      mutationFn: (input) =>
        apiClient.post<ArticleAiTextResult>(
          `/kb/articles/${articleId}/ai/suggest-related`,
          {},
          { signal: input?.signal },
        ),
    },
  );
}
