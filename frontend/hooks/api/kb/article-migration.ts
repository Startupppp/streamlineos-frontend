"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type ArticleMigrationPreview = {
  total: number;
  byStatus: Record<string, number>;
  alreadyMigrated: number;
  willMigrate: number;
  sample: { id: number; title: string; visibility: string }[];
};

export type MigrationResult = {
  migrated: number;
  skipped: number;
  total: number;
  dryRun: boolean;
  jobId?: number;
};

export function useArticleMigrationPreview() {
  return useQuery({
    queryKey: queryKeys.kb.articleMigrationPreview(),
    queryFn: () => apiClient.get<ArticleMigrationPreview>("/kb/article-migration/preview"),
    staleTime: 60_000,
  });
}

export function useRunArticleMigration() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "article-migration", "run"],
    mutationFn: (body: { dryRun?: boolean }) =>
      apiClient.post<MigrationResult>("/kb/article-migration/run", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.importJobs() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.articleMigrationPreview() });
    },
  });
}
