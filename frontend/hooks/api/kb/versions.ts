"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { KbArticle, KbArticleVersion } from "@/types/kb";

export function useKbArticleVersions(articleId: number) {
  const canViewArticles = useCan("kb:articles:view");
  return useQuery({
    queryKey: queryKeys.kb.versions(articleId),
    queryFn: () => apiClient.get<KbArticleVersion[]>(`/kb/articles/${articleId}/versions`),
    enabled: canViewArticles && articleId > 0,
    staleTime: 30_000,
  });
}

export function useRestoreKbArticleVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, versionNumber }: { articleId: number; versionNumber: number }) =>
      apiClient.post<KbArticle>(`/kb/articles/${articleId}/versions/${versionNumber}/restore`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(variables.articleId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.versions(variables.articleId) });
    },
  });
}
