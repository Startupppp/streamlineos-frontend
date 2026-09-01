"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { downloadBlob } from "@/lib/download-blob";

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

export function usePrepareFilingExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "filings", "export"],
    mutationFn: (body: {
      filingType: FilingType;
      fiscalYear?: string;
      month?: string;
      runId?: number;
      entityId?: number;
    }) => apiClient.post<PayrollFiling>("/payroll/filings/export", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.filingsAll });
    },
  });
}

export function useAttachAcknowledgement() {
  const qc = useQueryClient();
  return useMutation({
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
