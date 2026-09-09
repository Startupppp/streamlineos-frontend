"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

/**
 * The resumable import, which was written on the backend and called by nothing.
 *
 * Six routes: open a job, stage rows against it, apply the next chunk until it
 * reports `finished`, read the rows that failed, and cancel. The single-shot
 * `POST /inventory/import/jobs` the screen used instead caps at 10,000 rows in
 * one request body and has no resume — and the screen was handing it
 * `preview.sample`, which the backend defines as `rows.slice(0, 20)`. A person
 * importing five thousand products got twenty, under a job that reported
 * COMPLETED.
 */

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

/** At most 5000 per call server-side; 1000 keeps a single request small enough to retry. */
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
  /** Of the file's bytes. The same key with a different checksum is refused. */
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

/**
 * Applies the next chunk. Called until `finished` — that is the resume loop, and
 * it is deliberately not fenced: each call is meant to advance the job, so
 * replaying one would stall the loop rather than protect it.
 */
export function useProcessImportChunk() {
  return useMutation<StagedImportProgress, Error, number>({
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

export function useStagedImportProgress(jobId: number | null) {
  const canImport = useCan("inventory:import");
  return useQuery<StagedImportProgress, Error>({
    queryKey: queryKeys.inventoryStagedImport.progress(jobId ?? 0),
    queryFn: () => apiClient.get<StagedImportProgress>(`/inventory/import/staged/${jobId ?? 0}`),
    staleTime: 0,
    enabled: canImport && jobId !== null,
  });
}

export function useStagedImportErrors(jobId: number | null, page = 1, limit = 50) {
  const canImport = useCan("inventory:import");
  return useQuery<{ items: StagedImportRowError[]; total: number }, Error>({
    queryKey: queryKeys.inventoryStagedImport.errors(jobId ?? 0, page),
    queryFn: () =>
      apiClient.get<{ items: StagedImportRowError[]; total: number }>(
        `/inventory/import/staged/${jobId ?? 0}/errors`,
        { page: String(page), limit: String(limit) },
      ),
    staleTime: 0,
    enabled: canImport && jobId !== null,
  });
}

/**
 * SHA-256 of the file's own bytes.
 *
 * The backend refuses a reused idempotency key whose checksum differs, which is
 * what stops "resume my import" from silently resuming a different file.
 */
export async function checksumOf(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
