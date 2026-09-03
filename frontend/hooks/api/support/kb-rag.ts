"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
    mutationFn: ({ orgId, question }: PublicAskKbInput) =>
      apiClient.post<KbAnswer>("/public/kb/ask", { org: orgId, question }),
  });
}

export function useSupportKbIndexStatus(id: number) {
  return useGatedQuery("support:kb:view", {
    queryKey: [...queryKeys.supportKb.article(id), "index-status"] as const,
    queryFn: ({ signal }) =>
      apiClient.get<KbIndexStatus>(`/support/kb/articles/${id}/index-status`, undefined, signal),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 15_000,
  });
}

export function useReindexSupportKbArticle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKb", "rag", "reindex"],
    mutationFn: (id: number) =>
      apiClient.post<ReindexResult>(`/support/kb/articles/${id}/reindex`, {}),
    onSuccess: (_, id) => {
      qc.invalidateQueries({
        queryKey: [...queryKeys.supportKb.article(id), "index-status"],
      });
    },
  });
}

export function useReindexAllSupportKb() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKb", "rag", "reindex-all"],
    mutationFn: () => apiClient.post<IndexAllResult>("/support/kb/reindex-all", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportKb.all }),
  });
}
