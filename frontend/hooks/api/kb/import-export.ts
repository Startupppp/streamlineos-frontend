"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type KbImportItem = {
  title: string;
  contentText?: string;
  parentPageId?: number;
};

export type ImportKbPagesInput = {
  items: KbImportItem[];
  sourceType: "markdown" | "html" | "zip";
};

export type ImportResult = {
  jobId: number;
  succeeded: number;
  failed: number;
  total: number;
};

export type KbImportJob = {
  id: number;
  orgId: string;
  sourceType: string;
  fileKey: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  totalItems: number;
  processedItems: number;
  succeededItems: number;
  failedItems: number;
  duplicateItems: number;
  errorReport: Record<string, unknown> | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KbExportJob = {
  id: number;
  orgId: string;
  scopeType: string;
  scopeId: number | null;
  format: "markdown" | "html";
  status: "pending" | "processing" | "completed" | "failed";
  fileKey: string | null;
  expiresAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

const kbImportResultContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-import-schema").then((m) => m.kbImportResultContract),
);

const kbImportJobListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-import-schema").then((m) => m.kbImportJobListContract),
);

const kbExportJobListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-import-schema").then((m) => m.kbExportJobListContract),
);

export function useImportKbPages() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:import", {
    mutationKey: ["kb", "pages", "import"],
    mutationFn: (input: ImportKbPagesInput) =>
      apiClient.post<ImportResult>("/kb/pages/import", input, undefined, kbImportResultContract),
    onSuccess: (result, variables) => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pagesTree() });
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.kbPages() });
      void qc
        .invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.importJobs() })
        .then(() => {
          const itemTitles = variables.items.map((item) => item.title);
          qc.setQueryData<KbImportJob[]>(
            knowledgeAndSurveysQueryKeys.kb.importJobs(),
            (previous) => {
              if (!previous) return previous;
              return previous.map((job) => {
                if (job.id !== result.jobId) return job;
                return {
                  ...job,
                  errorReport: {
                    ...(job.errorReport ?? {}),
                    itemTitles,
                  },
                };
              });
            },
          );
        });
    },
  });
}

export function useKbImportJobs() {
  const canImport = useCan("kb:pages:import");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.importJobs(),
    queryFn: ({ signal }) =>
      apiClient.get<KbImportJob[]>("/kb/import-jobs", undefined, signal, kbImportJobListContract),
    enabled: canImport,
    staleTime: 30_000,
  });
}

export function useKbExportJobs() {
  const canExport = useCan("kb:pages:export");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.exportJobs(),
    queryFn: ({ signal }) =>
      apiClient.get<KbExportJob[]>("/kb/export-jobs", undefined, signal, kbExportJobListContract),
    enabled: canExport,
    staleTime: 30_000,
  });
}
