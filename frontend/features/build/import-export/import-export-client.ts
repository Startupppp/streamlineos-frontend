import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { IDEMPOTENCY_HEADER } from "@/lib/idempotency-key";
import type {
  ImportFormat,
  ImportMode,
  TicketExport,
  TicketImportPreview,
  TicketImportReport,
} from "./import-export-contract";

const previewContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.ticketImportExportPreviewImportResponseSchema,
  ),
);

const commitContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.ticketImportExportCommitImportResponseSchema,
  ),
);

const exportContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.ticketImportExportExportTicketsResponseSchema,
  ),
);

export interface PreviewTicketImportInput {
  projectId: number;
  format: ImportFormat;
  content: string;
  signal?: AbortSignal;
}

export interface CommitTicketImportInput {
  projectId: number;
  format: ImportFormat;
  content: string;
  confirmationToken: string;
  mode?: ImportMode;
  idempotencyKey: string;
  signal?: AbortSignal;
}

export interface ExportTicketsInput {
  projectId: number;
  format: ImportFormat;
  limit?: number;
  ticketIds?: number[];
  signal?: AbortSignal;
}

export function previewTicketImport(
  input: PreviewTicketImportInput,
): Promise<TicketImportPreview> {
  return apiClient.post<TicketImportPreview>(
    `/build/${input.projectId}/import-export/tickets/preview`,
    { format: input.format, content: input.content },
    input.signal ? { signal: input.signal } : undefined,
    previewContract,
  );
}

export function commitTicketImport(
  input: CommitTicketImportInput,
): Promise<TicketImportReport> {
  return apiClient.post<TicketImportReport>(
    `/build/${input.projectId}/import-export/tickets`,
    {
      format: input.format,
      content: input.content,
      confirmationToken: input.confirmationToken,
      mode: input.mode ?? "atomic",
    },
    {
      headers: { [IDEMPOTENCY_HEADER]: input.idempotencyKey },
      ...(input.signal ? { signal: input.signal } : {}),
    },
    commitContract,
  );
}

export function exportTickets(input: ExportTicketsInput): Promise<TicketExport> {
  const params: Record<string, unknown> = { format: input.format };
  if (input.limit !== undefined) params.limit = input.limit;
  if (input.ticketIds !== undefined && input.ticketIds.length > 0)
    params.ticketIds = input.ticketIds.join(",");
  return apiClient.get<TicketExport>(
    `/build/${input.projectId}/import-export/tickets/export`,
    params,
    input.signal,
    exportContract,
  );
}
