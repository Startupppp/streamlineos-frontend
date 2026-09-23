"use client";

import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { newIdempotencyKey } from "@/lib/idempotency-key";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import {
  commitTicketImport,
  exportTickets,
  previewTicketImport,
} from "@/features/build/import-export/import-export-client";
import type {
  ImportFormat,
  ImportMode,
  TicketExport,
  TicketImportPreview,
  TicketImportReport,
} from "@/features/build/import-export/import-export-contract";

export interface PreviewTicketImportVariables {
  format: ImportFormat;
  content: string;
  signal?: AbortSignal;
}

export interface CommitTicketImportVariables {
  format: ImportFormat;
  content: string;
  confirmationToken: string;
  mode?: ImportMode;
}

export interface ExportTicketsVariables {
  format: ImportFormat;
  limit?: number;
}

function useCommitKey(): (confirmationToken: string) => string {
  const attempt = useRef<{ token: string; key: string } | null>(null);
  return (confirmationToken: string): string => {
    if (attempt.current === null || attempt.current.token !== confirmationToken)
      attempt.current = { token: confirmationToken, key: newIdempotencyKey() };
    return attempt.current.key;
  };
}

export function usePreviewTicketImport(projectId: number) {
  return useAuthorizedMutation<TicketImportPreview, Error, PreviewTicketImportVariables>(
    "build:tickets:create",
    {
      mutationKey: buildWorkQueryKeys.projects.importExport.preview(projectId),
      mutationFn: (variables) =>
        previewTicketImport({
          projectId,
          format: variables.format,
          content: variables.content,
          ...(variables.signal ? { signal: variables.signal } : {}),
        }),
    },
  );
}

export function useCommitTicketImport(projectId: number) {
  const qc = useQueryClient();
  const keyFor = useCommitKey();
  return useAuthorizedMutation<TicketImportReport, Error, CommitTicketImportVariables>(
    "build:tickets:create",
    {
      mutationKey: buildWorkQueryKeys.projects.importExport.commit(projectId),
      mutationFn: (variables) =>
        commitTicketImport({
          projectId,
          format: variables.format,
          content: variables.content,
          confirmationToken: variables.confirmationToken,
          ...(variables.mode ? { mode: variables.mode } : {}),
          idempotencyKey: keyFor(variables.confirmationToken),
        }),
      onSuccess: (report) => {
        if (report.summary.imported === 0) return;
        qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.tickets() });
        qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.allWork() });
        qc.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.columnCounts(projectId),
        });
      },
    },
  );
}

export function useExportTickets(projectId: number) {
  return useAuthorizedMutation<TicketExport, Error, ExportTicketsVariables>(
    "build:tickets:view",
    {
      mutationKey: buildWorkQueryKeys.projects.importExport.export(projectId),
      mutationFn: (variables) =>
        exportTickets({
          projectId,
          format: variables.format,
          ...(variables.limit === undefined ? {} : { limit: variables.limit }),
        }),
    },
  );
}
