"use client";

import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useCan } from "@/hooks/api/access";
import { newIdempotencyKey } from "@/lib/idempotency-key";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import {
  commitTicketImport,
  exportTickets,
  previewTicketImport,
} from "@/features/build/import-export/import-export-client";
import type {
  TicketImportExportPreviewImportResponse,
  TicketImportExportCommitImportResponse,
  TicketImportExportExportTicketsResponse,
  TicketImportExportPreviewExportResponse,
} from "@/contracts/build-contracts.generated";
import type { ImportFormat, ImportMode } from "@/features/build/import-export/import-export-contract";

interface PreviewTicketImportVariables {
  format: ImportFormat;
  content: string;
  signal?: AbortSignal;
}

interface CommitTicketImportVariables {
  format: ImportFormat;
  content: string;
  confirmationToken: string;
  mode?: ImportMode;
}

interface ExportTicketsVariables {
  format: ImportFormat;
  limit?: number;
  ticketIds?: number[];
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
  return useAuthorizedMutation<TicketImportExportPreviewImportResponse, Error, PreviewTicketImportVariables>(
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
  return useAuthorizedMutation<TicketImportExportCommitImportResponse, Error, CommitTicketImportVariables>(
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

const ticketExportPreviewContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.ticketImportExportPreviewExportResponseSchema),
);

export function useExportTicketsPreview(projectId: number) {
  const canView = useCan("build:tickets:view");
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.importExport.exportPreview(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<TicketImportExportPreviewExportResponse>(
        `/build/${projectId}/import-export/tickets/export/preview`,
        undefined,
        signal,
        ticketExportPreviewContract,
      ),
    enabled: canView && projectId > 0,
    staleTime: 30_000,
  });
}

interface TicketSelectionExportGroup {
  projectId: number;
  ticketIds: number[];
}

export function useExportTicketSelection() {
  return useAuthorizedMutation<TicketImportExportExportTicketsResponse[], Error, TicketSelectionExportGroup[]>(
    "build:tickets:view",
    {
      mutationKey: buildWorkQueryKeys.projects.importExport.selectionExport(),
      mutationFn: async (groups) => {
        const results: TicketImportExportExportTicketsResponse[] = [];
        for (const group of groups) {
          results.push(await exportTickets({ projectId: group.projectId, format: "csv", ticketIds: group.ticketIds }));
        }
        return results;
      },
    },
  );
}

export function useExportTickets(projectId: number) {
  return useAuthorizedMutation<TicketImportExportExportTicketsResponse, Error, ExportTicketsVariables>(
    "build:tickets:view",
    {
      mutationKey: buildWorkQueryKeys.projects.importExport.export(projectId),
      mutationFn: (variables) =>
        exportTickets({
          projectId,
          format: variables.format,
          ...(variables.limit === undefined ? {} : { limit: variables.limit }),
          ...(variables.ticketIds !== undefined ? { ticketIds: variables.ticketIds } : {}),
        }),
    },
  );
}
