"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { lazyContract } from "@/lib/api-envelope";
import type { z } from "zod";
import type { auditExportJobContract } from "./restored-surfaces-schema";
const auditExportPageResponse = lazyContract(() =>
  import("./restored-surfaces-schema").then((m) => m.auditExportPageContract),
);
const auditExportJobResponse = lazyContract(() =>
  import("./restored-surfaces-schema").then((m) => m.auditExportJobContract),
);
const auditExportVerificationResponse = lazyContract(() =>
  import("./restored-surfaces-schema").then((m) => m.auditExportVerificationContract),
);

/**
 * A checksummed evidence bundle of the inventory ledger.
 *
 * Five routes, none of them called. `inventory:audit:export` — the right to take
 * evidence away, deliberately separate from `inventory:audit:read`, the right to
 * look at the trail — existed with nothing behind it, so an auditor asking for
 * the ledger got a screenshot.
 *
 * The document is not stored: its bytes are a function of the pinned evidence
 * version, the job's warehouse scope and its date filters, so every download
 * reproduces the same file and `verify` re-streams it to prove the checksum
 * still matches.
 */

export type AuditExportJob = z.infer<typeof auditExportJobContract>;
export type AuditExportStatus = AuditExportJob["status"];

export interface AuditExportVerification {
  jobId: number;
  schemaVersion: number;
  evidenceVersion: string;
  checksumAlgorithm: string;
  expectedChecksum: string | null;
  actualChecksum: string;
  expectedByteLength: number | null;
  actualByteLength: number;
  match: boolean;
}

export function useAuditExportJobs(params?: { page?: number; limit?: number }) {
  const canExport = useCan("inventory:audit:export");
  return useQuery<
    { items: AuditExportJob[]; total: number; page: number; totalPages: number },
    Error
  >({
    queryKey: queryKeys.inventoryAuditExport.jobs(params),
    queryFn: ({ signal }) =>
      apiClient.get<{
        items: AuditExportJob[];
        total: number;
        page: number;
        totalPages: number;
      }>("/inventory/audit-export/jobs", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }, signal, auditExportPageResponse),
    // A job settles asynchronously, so the list is the progress indicator.
    staleTime: 0,
    refetchInterval: 10_000,
    enabled: canExport,
  });
}

/**
 * One settling job, for a caller watching a single export rather than the list.
 *
 * `GET /inventory/audit-export/jobs/:jobId` is still served. Restored after the
 * key it reads was deleted as unreferenced while this hook was calling it, and
 * this hook was then deleted as collateral of an AbortSignal sweep — which could
 * only ever have asked for the signal to be threaded, as it now is.
 */
export function useAuditExportJob(jobId: number | null) {
  const canExport = useCan("inventory:audit:export");
  return useQuery<AuditExportJob, Error>({
    queryKey: queryKeys.inventoryAuditExport.job(jobId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<AuditExportJob>(
        `/inventory/audit-export/jobs/${jobId ?? 0}`,
        undefined,
        signal,
        auditExportJobResponse,
      ),
    staleTime: 0,
    enabled: canExport && jobId !== null,
  });
}

export function useCreateAuditExportJob() {
  const qc = useQueryClient();
  return useIdempotentMutation<AuditExportJob, Error, { from?: string; to?: string }>({
    mutationKey: ["inventory", "audit-export", "create"],
    mutationFn: (input, idempotencyKey) =>
      apiClient.post<AuditExportJob>("/inventory/audit-export/jobs", input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }, auditExportJobResponse),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryAuditExport.jobsAll });
    },
  });
}

/**
 * Re-streams the bundle and compares. Fetched on demand rather than on mount:
 * verifying is as expensive as producing the document, so it is a decision the
 * reader makes and not a thing that happens because a row scrolled into view.
 */
export function useVerifyAuditExport(jobId: number | null, enabled: boolean) {
  const canExport = useCan("inventory:audit:export");
  return useQuery<AuditExportVerification, Error>({
    queryKey: queryKeys.inventoryAuditExport.verification(jobId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<AuditExportVerification>(
        `/inventory/audit-export/jobs/${jobId ?? 0}/verify`,
        undefined,
        signal,
        auditExportVerificationResponse,
      ),
    staleTime: 0,
    gcTime: 0,
    enabled: canExport && jobId !== null && enabled,
  });
}

/**
 * The bundle itself, as NDJSON.
 *
 * Not a `useQuery`: the response is a file, and holding it in the query cache
 * would keep every byte of an audit export in memory for the rest of the session.
 */
export async function downloadAuditExport(jobId: number): Promise<void> {
  const blob = await apiClient.download(`/inventory/audit-export/jobs/${jobId}/download`);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `inventory-audit-export-${String(jobId)}.ndjson`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
