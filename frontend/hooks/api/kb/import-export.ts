"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

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
  sourceType: "markdown" | "html" | "zip";
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
  scopeType: "page" | "all";
  scopeId: number | null;
  format: "markdown" | "html";
  status: "pending" | "processing" | "completed" | "failed";
  fileKey: string | null;
  expiresAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

export function useImportKbPages() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pages", "import"],
    mutationFn: (input: ImportKbPagesInput) =>
      apiClient.post<ImportResult>("/kb/pages/import", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pagesTree() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.kbPages() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.importJobs() });
    },
  });
}

export function useKbImportJobs() {
  const canImport = useCan("kb:pages:import");
  return useQuery({
    queryKey: queryKeys.kb.importJobs(),
    queryFn: () => apiClient.get<KbImportJob[]>("/kb/import-jobs"),
    enabled: canImport,
    staleTime: 30_000,
  });
}

export function useKbExportJobs() {
  const canExport = useCan("kb:pages:export");
  return useQuery({
    queryKey: queryKeys.kb.exportJobs(),
    queryFn: () => apiClient.get<KbExportJob[]>("/kb/export-jobs"),
    enabled: canExport,
    staleTime: 30_000,
  });
}
