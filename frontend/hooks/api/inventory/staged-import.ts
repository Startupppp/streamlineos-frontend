"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


export const IMPORT_TYPES = [
  "products",
  "vendors",
  "categories",
  "uom",
  "locations",
  "opening-stock",
  "reorder-rules",
] as const;
export type StagedImportType = (typeof IMPORT_TYPES)[number];

export const STAGE_CHUNK_SIZE = 1000;

export interface StagedImportProgress {
  jobId: number;
  status: string;
  importType: string;
  totalRows: number;
  stagedRows: number;
  appliedRows: number;
  failedRows: number;
  nextRow: number;
  cancelled: boolean;
  finished: boolean;
  chunk: Array<{
    rowNumber: number;
    status: "APPLIED" | "FAILED" | "SKIPPED";
    code?: string;
    field?: string;
    message?: string;
  }> | null;
}

export interface StagedImportRowError {
  rowNumber: number;
  code: string | null;
  field: string | null;
  message: string | null;
}

export interface OpenStagedImportInput {
  importType: StagedImportType;
  fileName?: string;
  totalRows: number;
  checksum: string;
  chunkSize?: number;
}

export function useOpenStagedImport() {
  return useIdempotentMutation<StagedImportProgress, Error, OpenStagedImportInput>({
    mutationKey: ["inventory", "import", "staged", "open"],
    mutationFn: (input, idempotencyKey) =>
      apiClient.post<StagedImportProgress>("/inventory/import/staged", input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
  });
}

export function useStageImportRows() {
  return useIdempotentMutation<
    StagedImportProgress,
    Error,
    { jobId: number; rows: Array<{ rowNumber: number; payload: Record<string, string> }> }
  >({
    mutationKey: ["inventory", "import", "staged", "rows"],
    mutationFn: ({ jobId, rows }, idempotencyKey) =>
      apiClient.post<StagedImportProgress>(
        `/inventory/import/staged/${jobId}/rows`,
        { rows },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
  });
}

export function useProcessImportChunk() {
  return useAuthorizedMutation<StagedImportProgress, Error, number>("inventory:import", {
    mutationKey: ["inventory", "import", "staged", "process"],
    mutationFn: (jobId) =>
      apiClient.post<StagedImportProgress>(`/inventory/import/staged/${jobId}/process`, {}),
  });
}

export function useCancelStagedImport() {
  const qc = useQueryClient();
  return useIdempotentMutation<StagedImportProgress, Error, number>({
    mutationKey: ["inventory", "import", "staged", "cancel"],
    mutationFn: (jobId, idempotencyKey) =>
      apiClient.post<StagedImportProgress>(
        `/inventory/import/staged/${jobId}/cancel`,
        {},
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryStagedImport.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.importJobs() });
    },
  });
}

export function useStagedImportErrors(jobId: number | null, page = 1, limit = 50) {
  const canImport = useCan("inventory:import");
  return useQuery<{ items: StagedImportRowError[]; total: number }, Error>({
    queryKey: queryKeys.inventoryStagedImport.errors(jobId ?? 0, page),
    queryFn: ({ signal }) =>
      apiClient.get<{ items: StagedImportRowError[]; total: number }>(
        `/inventory/import/staged/${jobId ?? 0}/errors`,
        { page: String(page), limit: String(limit) },
        signal,
      ),
    staleTime: 0,
    enabled: canImport && jobId !== null,
  });
}

export async function checksumOf(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
