"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import {
  payrollReportSummaryContract,
  type PayrollReportSummary,
} from "@/hooks/api/payroll/runs-schema";

const registerReportC = lazyContract(() =>
  import("@/hooks/api/payroll/reports-schema").then((m) => m.registerReportContract),
);
const deptCostReportC = lazyContract(() =>
  import("@/hooks/api/payroll/reports-schema").then((m) => m.deptCostReportContract),
);
const costCenterReportC = lazyContract(() =>
  import("@/hooks/api/payroll/reports-schema").then((m) => m.costCenterReportContract),
);
const componentPivotReportC = lazyContract(() =>
  import("@/hooks/api/payroll/reports-schema").then((m) => m.componentPivotReportContract),
);
const bankPayoutReportC = lazyContract(() =>
  import("@/hooks/api/payroll/reports-schema").then((m) => m.bankPayoutReportContract),
);
const varianceReportC = lazyContract(() =>
  import("@/hooks/api/payroll/reports-schema").then((m) => m.varianceReportContract),
);
const journalReportC = lazyContract(() =>
  import("@/hooks/api/payroll/reports-schema").then((m) => m.journalReportContract),
);
import { downloadBlob } from "@/lib/download-blob";
import type {
  PayrollSummaryReport,
  PayrollRegisterReport,
  PayrollDeptCostReport,
  PayrollCostCenterReport,
  ComponentPivotReport,
  BankPayoutReport,
  VarianceReport,
  JournalReport,
} from "@/types/payroll/reports";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

type ReportFilterParams = {
  month: string;
  department?: string;
  costCenter?: string;
  workerType?: string;
};

export function usePayrollSummary(params: ReportFilterParams) {
  const canView = useCan("payroll:reports:view");
  return useQuery<PayrollReportSummary, Error>({
    queryKey: payrollQueryKeys.payroll.reports("summary", params),
    queryFn: ({ signal }) => apiClient.get("/payroll/reports/summary", params, signal, payrollReportSummaryContract),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollRegister(params: ReportFilterParams) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.reports("register", params),
    queryFn: ({ signal }) => apiClient.get<PayrollRegisterReport>("/payroll/reports/register", params, signal, registerReportC),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollDeptCost(params: Omit<ReportFilterParams, "costCenter">) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.reports("department-cost", params),
    queryFn: ({ signal }) => apiClient.get<PayrollDeptCostReport>("/payroll/reports/department-cost", params, signal, deptCostReportC),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollCostCenter(params: Omit<ReportFilterParams, "department">) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.reports("cost-center", params),
    queryFn: ({ signal }) => apiClient.get<PayrollCostCenterReport>("/payroll/reports/cost-center", params, signal, costCenterReportC),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollEarnings(params: ReportFilterParams, options?: { enabled?: boolean }) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.reports("earnings", params),
    queryFn: ({ signal }) => apiClient.get<ComponentPivotReport>("/payroll/reports/earnings", params, signal, componentPivotReportC),
    staleTime: 60_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function usePayrollDeductions(params: ReportFilterParams, options?: { enabled?: boolean }) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.reports("deductions", params),
    queryFn: ({ signal }) => apiClient.get<ComponentPivotReport>("/payroll/reports/deductions", params, signal, componentPivotReportC),
    staleTime: 60_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function usePayrollReimbursementsReport(params: ReportFilterParams, options?: { enabled?: boolean }) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.reports("reimbursements", params),
    queryFn: ({ signal }) => apiClient.get<ComponentPivotReport>("/payroll/reports/reimbursements", params, signal, componentPivotReportC),
    staleTime: 60_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function usePayrollTaxReport(params: ReportFilterParams, options?: { enabled?: boolean }) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.reports("tax", params),
    queryFn: ({ signal }) => apiClient.get<ComponentPivotReport>("/payroll/reports/tax", params, signal, componentPivotReportC),
    staleTime: 60_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function usePayrollBankPayout(month: string) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.reports("bank-payout", { month }),
    queryFn: ({ signal }) => apiClient.get<BankPayoutReport>("/payroll/reports/bank-payout", { month }, signal, bankPayoutReportC),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollVariance(month: string) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.reports("variance", { month }),
    queryFn: ({ signal }) => apiClient.get<VarianceReport>("/payroll/reports/variance", { month }, signal, varianceReportC),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollJournal(month: string) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.reports("journal", { month }),
    queryFn: ({ signal }) => apiClient.get<JournalReport>("/payroll/reports/journal", { month }, signal, journalReportC),
    staleTime: 60_000,
    enabled: canView,
  });
}

type ExportReportInput = {
  reportType: string;
  month: string;
  department?: string;
  costCenter?: string;
  workerType?: string;
};

export function useExportPayrollReport() {
  return useAuthorizedMutation("payroll:reports:export", {
    mutationKey: ["payroll", "export-report"],
    mutationFn: async ({ reportType, month, department, costCenter, workerType }: ExportReportInput) => {
      const blob = await apiClient.download(`/payroll/reports/${reportType}`, {
        month,
        format: "csv",
        ...(department !== undefined && { department }),
        ...(costCenter !== undefined && { costCenter }),
        ...(workerType !== undefined && { workerType }),
      });
      downloadBlob(blob, `payroll-${reportType}-${month}.csv`);
    },
  });
}

export function useExportJournal() {
  return useAuthorizedMutation("payroll:reports:export", {
    mutationKey: ["payroll", "export-journal"],
    mutationFn: async ({ month }: { month: string }) => {
      const blob = await apiClient.download("/payroll/reports/journal", { month, format: "csv" });
      downloadBlob(blob, `payroll-journal-${month}.csv`);
    },
  });
}
