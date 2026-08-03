"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
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

type ReportFilterParams = {
  month: string;
  department?: string;
  costCenter?: string;
  workerType?: string;
};

export function usePayrollSummary(params: ReportFilterParams) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: queryKeys.payroll.reports("summary", params as Record<string, unknown>),
    queryFn: () => apiClient.get<PayrollSummaryReport>("/payroll/reports/summary", params),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollRegister(params: ReportFilterParams) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: queryKeys.payroll.reports("register", params as Record<string, unknown>),
    queryFn: () => apiClient.get<PayrollRegisterReport>("/payroll/reports/register", params),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollDeptCost(params: Omit<ReportFilterParams, "costCenter">) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: queryKeys.payroll.reports("department-cost", params as Record<string, unknown>),
    queryFn: () => apiClient.get<PayrollDeptCostReport>("/payroll/reports/department-cost", params),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollCostCenter(params: Omit<ReportFilterParams, "department">) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: queryKeys.payroll.reports("cost-center", params as Record<string, unknown>),
    queryFn: () => apiClient.get<PayrollCostCenterReport>("/payroll/reports/cost-center", params),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollEarnings(params: ReportFilterParams, options?: { enabled?: boolean }) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: queryKeys.payroll.reports("earnings", params as Record<string, unknown>),
    queryFn: () => apiClient.get<ComponentPivotReport>("/payroll/reports/earnings", params),
    staleTime: 60_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function usePayrollDeductions(params: ReportFilterParams, options?: { enabled?: boolean }) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: queryKeys.payroll.reports("deductions", params as Record<string, unknown>),
    queryFn: () => apiClient.get<ComponentPivotReport>("/payroll/reports/deductions", params),
    staleTime: 60_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function usePayrollReimbursementsReport(params: ReportFilterParams, options?: { enabled?: boolean }) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: queryKeys.payroll.reports("reimbursements", params as Record<string, unknown>),
    queryFn: () => apiClient.get<ComponentPivotReport>("/payroll/reports/reimbursements", params),
    staleTime: 60_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function usePayrollTaxReport(params: ReportFilterParams, options?: { enabled?: boolean }) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: queryKeys.payroll.reports("tax", params as Record<string, unknown>),
    queryFn: () => apiClient.get<ComponentPivotReport>("/payroll/reports/tax", params),
    staleTime: 60_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function usePayrollBankPayout(month: string) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: queryKeys.payroll.reports("bank-payout", { month }),
    queryFn: () => apiClient.get<BankPayoutReport>("/payroll/reports/bank-payout", { month }),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollVariance(month: string) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: queryKeys.payroll.reports("variance", { month }),
    queryFn: () => apiClient.get<VarianceReport>("/payroll/reports/variance", { month }),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePayrollJournal(month: string) {
  const canView = useCan("payroll:reports:view");
  return useQuery({
    queryKey: queryKeys.payroll.reports("journal", { month }),
    queryFn: () => apiClient.get<JournalReport>("/payroll/reports/journal", { month }),
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
  return useMutation({
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
  return useMutation({
    mutationKey: ["payroll", "export-journal"],
    mutationFn: async ({ month }: { month: string }) => {
      const blob = await apiClient.download("/payroll/reports/journal", { month, format: "csv" });
      downloadBlob(blob, `payroll-journal-${month}.csv`);
    },
  });
}
