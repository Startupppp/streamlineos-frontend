"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { downloadBlob } from "@/lib/download-blob";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
export interface FilingExportJob {
  jobId: number;
  status: FilingExportJobStatus;
  progress: number;
  filingId: number | null;
  correlationId: string | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
  statusLabel: string;
  capability?: FilingCapability;
}

/** Backend honesty contract — filings are export-only until a provider is connected. */
export interface FilingCapability {
  mode: "export_only";
  automaticFiling: boolean;
  automaticRemittance: boolean;
  providerDependent: boolean;
  honestyLabel: string;
  supportedTypes: FilingType[];
  note: string;
  ruleBundleVersion?: string;
  ruleEffectiveFrom?: string;
  artifactFormat?: "csv";
  formLabels?: { quarterlyReturn: string; annualCertificate: string };
}

export function usePayrollFilings() {
  const canView = useCan("payroll:tax:view");
  return useQuery({
    queryKey: queryKeys.payroll.filingsAll,
    queryFn: ({ signal }) => apiClient.get<PayrollFiling[]>("/payroll/filings", undefined, signal),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useFilingCapabilities() {
  const canView = useCan("payroll:tax:view");
  return useQuery({
    queryKey: queryKeys.payroll.filingCapabilities(),
    queryFn: ({ signal }) => apiClient.get<FilingCapability>("/payroll/filings/capabilities", undefined, signal),
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
    }) => apiClient.post<FilingExportJob>("/payroll/filings/export", body),
  });
}

export function useFilingExportJob(jobId: number | null) {
  const canView = useCan("payroll:tax:view");
  return useQuery({
    queryKey: queryKeys.payroll.filingExportJob(jobId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<FilingExportJob>(
        `/payroll/filings/export/jobs/${jobId}`,
        undefined,
        signal,
      ),
    enabled: canView && jobId != null,
    refetchInterval: (query) =>
      query.state.data && FILING_EXPORT_TERMINAL.includes(query.state.data.status)
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
      apiClient.patch<PayrollFiling>(
        `/payroll/filings/${filingId}/acknowledgement`,
        { challanRef, acknowledgementRef },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.filingsAll });
    },
  });
}

export async function downloadFilingExport(filingId: number): Promise<void> {
  const blob = await apiClient.download(`/payroll/filings/${filingId}/export`);
  downloadBlob(blob, `filing_${filingId}.csv`);
}
