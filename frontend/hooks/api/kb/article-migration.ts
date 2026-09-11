"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
  failed: number;
  failedArticleIds?: number[];
};

const kbMigrationPreviewContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-import-schema").then((m) => m.kbMigrationPreviewContract),
);

const kbMigrationRunContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-import-schema").then((m) => m.kbMigrationRunContract),
);

export function useArticleMigrationPreview() {
  const canManageSettings = useCan("kb:settings:manage");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.articleMigrationPreview(),
    queryFn: ({ signal }) => apiClient.get<ArticleMigrationPreview>("/kb/article-migration/preview", undefined, signal, kbMigrationPreviewContract),
    staleTime: 60_000,
    enabled: canManageSettings,
  });
}

export function useRunArticleMigration() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:settings:manage", {
    mutationKey: ["kb", "article-migration", "run"],
    mutationFn: (body: { dryRun?: boolean }) =>
      apiClient.post<MigrationResult>("/kb/article-migration/run", body, undefined, kbMigrationRunContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.importJobs() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.articleMigrationPreview() });
    },
  });
}
