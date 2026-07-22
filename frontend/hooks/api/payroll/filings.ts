"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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
}

export const filingsKeys = {
  all: ["payroll", "filings"] as const,
};

export function usePayrollFilings() {
  return useQuery({
    queryKey: filingsKeys.all,
    queryFn: () => apiClient.get<PayrollFiling[]>("/payroll/filings"),
    staleTime: 60_000,
  });
}

export function usePrepareFilingExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "filings", "export"],
    mutationFn: (body: { filingType: FilingType; fiscalYear?: string }) =>
      apiClient.post<PayrollFiling>("/payroll/filings/export", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: filingsKeys.all });
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
      void qc.invalidateQueries({ queryKey: filingsKeys.all });
    },
  });
}
