"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { KbTranslation, UpsertTranslationInput } from "@/types/kb";

export function useKbTranslations(articleId: number) {
  const canViewArticles = useCan("kb:articles:view");
  return useQuery({
    queryKey: queryKeys.kb.translations(articleId),
    queryFn: () => apiClient.get<KbTranslation[]>(`/kb/articles/${articleId}/translations`),
    enabled: canViewArticles && articleId > 0,
    staleTime: 30_000,
  });
}

export function useKbTranslation(articleId: number, locale: string) {
  const canViewArticles = useCan("kb:articles:view");
  return useQuery({
    queryKey: queryKeys.kb.translation(articleId, locale),
    queryFn: () => apiClient.get<KbTranslation>(`/kb/articles/${articleId}/translations/${locale}`),
    enabled: canViewArticles && articleId > 0 && locale.length > 0,
    staleTime: 30_000,
  });
}

export function useUpsertKbTranslation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, locale, ...data }: UpsertTranslationInput) =>
      apiClient.put<KbTranslation>(`/kb/articles/${articleId}/translations/${locale}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.translations(variables.articleId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.translation(variables.articleId, variables.locale) });
    },
  });
}

export function useDeleteKbTranslation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, locale }: { articleId: number; locale: string }) =>
      apiClient.delete<void>(`/kb/articles/${articleId}/translations/${locale}`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.translations(variables.articleId) });
    },
  });
}
