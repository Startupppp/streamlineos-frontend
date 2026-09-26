"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type KbExportFormat = "markdown" | "html";

export interface ExportKbPageInput {
  pageId: number;
  format: KbExportFormat;
}

export interface KbExportResult {
  jobId: number;
  format: KbExportFormat;
  content: string;
}

const kbExportResultContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-import-schema").then((m) => m.kbExportResultContract),
);

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function useExportKbPage() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:export", {
    mutationKey: ["kb", "pages", "export"],
    mutationFn: ({ pageId, format }: ExportKbPageInput) =>
      apiClient.post<KbExportResult>(
        `/kb/pages/${pageId}/export`,
        { format },
        undefined,
        kbExportResultContract,
      ),
    onSuccess: (result, variables) => {
      const isHtml = result.format === "html";
      triggerDownload(
        result.content,
        `page-${variables.pageId}${isHtml ? ".html" : ".md"}`,
        isHtml ? "text/html;charset=utf-8" : "text/plain;charset=utf-8",
      );
      qc.invalidateQueries({
        queryKey: knowledgeAndSurveysQueryKeys.kb.exportJobs(),
      });
    },
  });
}
