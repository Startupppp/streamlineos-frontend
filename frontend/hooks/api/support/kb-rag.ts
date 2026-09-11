"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import { streamAiText } from "@/hooks/api/ai-text-stream";
import type { AiResultStreamOptions } from "@/hooks/api/ai-result-stream";
import { publicKbSourcesSchema } from "./kb-rag-schema";

const kbIndexStatusC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbIndexStatusContract),
);
const kbReindexArticleC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbReindexArticleContract),
);
const kbReindexAllC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbReindexAllContract),
);

export interface KbAnswerSource {
  articleId: number;
  title: string;
  slug: string;
  attachmentId: number | null;
  attachmentName: string | null;
  similarity: number;
}

export interface KbAnswer {
  answer: string;
  sources: KbAnswerSource[];
  hasContext: boolean;
}

interface KbIndexStatus {
  chunks: number;
  lastIndexedAt: string | null;
}

interface ReindexResult {
  chunks: number;
  warnings: string[];
}

interface IndexAllResult {
  total: number;
  indexed: number;
  totalChunks: number;
  failures: { articleId: number; error: string }[];
}

interface PublicAskKbInput {
  orgId: string;
  question: string;
}

export function usePublicAskSupportKb() {
  return useMutation({
    mutationKey: ["supportKb", "rag", "public-ask"],
    mutationFn: async ({ orgId, question, signal, onToken }: PublicAskKbInput & AiResultStreamOptions): Promise<KbAnswer> => {
      let sources: KbAnswerSource[] = [];
      function handleHeaders(headers: Headers) {
        const value = headers.get("x-kb-sources");
        if (!value) return;
        const raw: unknown = JSON.parse(decodeURIComponent(value));
        sources = publicKbSourcesSchema.parse(raw);
      }
      const result = await streamAiText({ path: "/public/kb/stream-ask", body: { org: orgId, question }, signal, onToken, onHeaders: handleHeaders });
      if (result.status === "cancelled") throw new DOMException("Generation stopped", "AbortError");
      return { answer: result.text, sources, hasContext: sources.length > 0 };
    },
  });
}

export function useSupportKbIndexStatus(id: number) {
  return useGatedQuery("support:kb:view", {
    queryKey: [...accountingAndSupportQueryKeys.supportKb.article(id), "index-status"] as const,
    queryFn: ({ signal }) =>
      apiClient.get<KbIndexStatus>(`/support/kb/articles/${id}/index-status`, undefined, signal, kbIndexStatusC),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 15_000,
  });
}

export function useReindexSupportKbArticle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKb", "rag", "reindex"],
    mutationFn: (id: number) =>
      apiClient.post<ReindexResult>(`/support/kb/articles/${id}/reindex`, {}, undefined, kbReindexArticleC),
    onSuccess: (_, id) => {
      qc.invalidateQueries({
        queryKey: [...accountingAndSupportQueryKeys.supportKb.article(id), "index-status"],
      });
    },
  });
}

export function useReindexAllSupportKb() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKb", "rag", "reindex-all"],
    mutationFn: () => apiClient.post<IndexAllResult>("/support/kb/reindex-all", {}, undefined, kbReindexAllC),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.supportKb.all }),
  });
}
