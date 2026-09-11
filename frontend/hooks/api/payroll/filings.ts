"use client";
import type { z } from "zod";
import type { filingExportJobContract } from "@/hooks/api/payroll/filings-schema";
import type { filingCapabilitiesResponseContract } from "@/hooks/api/payroll/filings-schema";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { downloadBlob } from "@/lib/download-blob";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const payrollFilingListC = lazyContract(() =>
  import("@/hooks/api/payroll/filings-schema").then(
    (m) => m.payrollFilingListContract,
  ),
);
const filingCapabilitiesC = lazyContract(() =>
  import("@/hooks/api/payroll/filings-schema").then(
    (m) => m.filingCapabilitiesResponseContract,
  ),
);
const filingExportJobC = lazyContract(() =>
  import("@/hooks/api/payroll/filings-schema").then(
    (m) => m.filingExportJobContract,
  ),
);
const payrollFilingC = lazyContract(() =>
  import("@/hooks/api/payroll/filings-schema").then(
    (m) => m.payrollFilingContract,
  ),
);

export type FilingType = "PF_ECR" | "ESI" | "PT" | "TDS_24Q" | "FORM16" | "LWF";

export type FilingStatus =
  | "DRAFT"
  | "EXPORT_PREPARED"
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "RECONCILED"
  | "FAILED";

export interface PayrollFiling {
  id: number;
  orgId: string;
  entityId: number | null;
  periodId: number | null;
  fiscalYear: string | null;
  filingType: FilingType;
  ruleVersion: string | null;
  status: FilingStatus;
  statusLabel: string | null;
  challanRef: string | null;
  acknowledgementRef: string | null;
  createdAt: string;
  exportSummary?: FilingExportSummary;
}

export interface FilingExportSummary {
  rowCount: number;
  totals: Record<string, string>;
  missingIdentifiers: string[];
  notes: string[];
  periodMonth: string | null;
  runId: number | null;
  ruleBundleVersion: string;
  entityId?: number | null;
}

export type FilingExportJobStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "DEAD_LETTER";

export const FILING_EXPORT_TERMINAL: FilingExportJobStatus[] = [
  "SUCCEEDED",
  "FAILED",
  "DEAD_LETTER",
];

/** Durable handle for an asynchronously prepared statutory export. */
export type FilingExportJob = z.infer<typeof filingExportJobContract>;

/** Backend honesty contract — filings are export-only until a provider is connected. */
export type FilingCapability = z.infer<
  typeof filingCapabilitiesResponseContract
>;

export function usePayrollFilings() {
  const canView = useCan("payroll:tax:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.filingsAll,
    queryFn: ({ signal }) =>
      apiClient.get("/payroll/filings", undefined, signal, payrollFilingListC),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useFilingCapabilities() {
  const canView = useCan("payroll:tax:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.filingCapabilities(),
    queryFn: ({ signal }) =>
      apiClient.get<FilingCapability>(
        "/payroll/filings/capabilities",
        undefined,
        signal,
        filingCapabilitiesC,
      ),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

/**
 * The CSV spans every run employee, so the backend prepares it on the payroll
 * jobs worker. This returns a job handle; poll it with `useFilingExportJob`.
 */
export function usePrepareFilingExport() {
  return useAuthorizedMutation("payroll:tax:manage", {
    mutationKey: ["payroll", "filings", "export"],
    mutationFn: (body: {
      filingType: FilingType;
      fiscalYear?: string;
      month?: string;
      runId?: number;
      entityId?: number;
    }) =>
      apiClient.post<FilingExportJob>(
        "/payroll/filings/export",
        body,
        undefined,
        filingExportJobC,
      ),
  });
}

export function useFilingExportJob(jobId: number | null) {
  const canView = useCan("payroll:tax:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.filingExportJob(jobId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<FilingExportJob>(
        `/payroll/filings/export/jobs/${jobId}`,
        undefined,
        signal,
        filingExportJobC,
      ),
    enabled: canView && jobId != null,
    refetchInterval: (query) =>
      query.state.data &&
      FILING_EXPORT_TERMINAL.includes(query.state.data.status)
        ? false
        : 2_000,
  });
}

export function useAttachAcknowledgement() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:tax:manage", {
    mutationKey: ["payroll", "filings", "acknowledgement"],
    mutationFn: ({
      filingId,
      challanRef,
      acknowledgementRef,
    }: {
      filingId: number;
      challanRef?: string;
      acknowledgementRef?: string;
    }) =>
      apiClient.patch(
        `/payroll/filings/${filingId}/acknowledgement`,
        { challanRef, acknowledgementRef },
        undefined,
        payrollFilingC,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: payrollQueryKeys.payroll.filingsAll,
      });
    },
  });
}

export async function downloadFilingExport(filingId: number): Promise<void> {
  const blob = await apiClient.download(`/payroll/filings/${filingId}/export`);
  downloadBlob(blob, `filing_${filingId}.csv`);
}
