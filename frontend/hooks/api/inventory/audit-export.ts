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
  import("./restored-surfaces-schema").then(
    (m) => m.auditExportVerificationContract,
  ),
);

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
    {
      items: AuditExportJob[];
      total: number;
      page: number;
      totalPages: number;
    },
    Error
  >({
    queryKey: queryKeys.inventoryAuditExport.jobs(params),
    queryFn: ({ signal }) =>
      apiClient.get<{
        items: AuditExportJob[];
        total: number;
        page: number;
        totalPages: number;
      }>(
        "/inventory/audit-export/jobs",
        {
          ...(params?.page ? { page: String(params.page) } : {}),
          ...(params?.limit ? { limit: String(params.limit) } : {}),
        },
        signal,
        auditExportPageResponse,
      ),
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.items.every(
        (j) => j.status === "COMPLETED" || j.status === "FAILED",
      )
        ? false
        : 10_000,
    enabled: canExport,
  });
}

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
  return useIdempotentMutation<
    AuditExportJob,
    Error,
    { from?: string; to?: string }
  >({
    mutationKey: ["inventory", "audit-export", "create"],
    mutationFn: (input, idempotencyKey) =>
      apiClient.post<AuditExportJob>(
        "/inventory/audit-export/jobs",
        input,
        {
          headers: { "Idempotency-Key": idempotencyKey },
        },
        auditExportJobResponse,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.inventoryAuditExport.jobsAll,
      });
    },
  });
}

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

export async function downloadAuditExport(jobId: number): Promise<void> {
  const blob = await apiClient.download(
    `/inventory/audit-export/jobs/${jobId}/download`,
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `inventory-audit-export-${String(jobId)}.ndjson`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
