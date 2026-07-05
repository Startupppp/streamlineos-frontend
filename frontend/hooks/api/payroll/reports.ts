"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
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

export const reportKeys = {
  all: ["payroll", "reports"] as const,
  summary: (params: ReportFilterParams) => ["payroll", "reports", "summary", params] as const,
  register: (params: ReportFilterParams) => ["payroll", "reports", "register", params] as const,
  deptCost: (params: Omit<ReportFilterParams, "costCenter">) => ["payroll", "reports", "dept-cost", params] as const,
  costCenter: (params: Omit<ReportFilterParams, "department">) => ["payroll", "reports", "cost-center", params] as const,
  earnings: (params: ReportFilterParams) => ["payroll", "reports", "earnings", params] as const,
  deductions: (params: ReportFilterParams) => ["payroll", "reports", "deductions", params] as const,
  reimbursements: (params: ReportFilterParams) => ["payroll", "reports", "reimbursements", params] as const,
  tax: (params: ReportFilterParams) => ["payroll", "reports", "tax", params] as const,
  bankPayout: (month: string) => ["payroll", "reports", "bank-payout", month] as const,
  variance: (month: string) => ["payroll", "reports", "variance", month] as const,
  journal: (month: string) => ["payroll", "reports", "journal", month] as const,
};

export function usePayrollSummary(params: ReportFilterParams) {
  return useQuery({
    queryKey: reportKeys.summary(params),
    queryFn: () => apiClient.get<PayrollSummaryReport>("/payroll/reports/summary", params),
    staleTime: 60_000,
  });
}

export function usePayrollRegister(params: ReportFilterParams) {
  return useQuery({
    queryKey: reportKeys.register(params),
    queryFn: () => apiClient.get<PayrollRegisterReport>("/payroll/reports/register", params),
    staleTime: 60_000,
  });
}

export function usePayrollDeptCost(params: Omit<ReportFilterParams, "costCenter">) {
  return useQuery({
    queryKey: reportKeys.deptCost(params),
    queryFn: () => apiClient.get<PayrollDeptCostReport>("/payroll/reports/department-cost", params),
    staleTime: 60_000,
  });
}

export function usePayrollCostCenter(params: Omit<ReportFilterParams, "department">) {
  return useQuery({
    queryKey: reportKeys.costCenter(params),
    queryFn: () => apiClient.get<PayrollCostCenterReport>("/payroll/reports/cost-center", params),
    staleTime: 60_000,
  });
}

export function usePayrollEarnings(params: ReportFilterParams) {
  return useQuery({
    queryKey: reportKeys.earnings(params),
    queryFn: () => apiClient.get<ComponentPivotReport>("/payroll/reports/earnings", params),
    staleTime: 60_000,
  });
}

export function usePayrollDeductions(params: ReportFilterParams) {
  return useQuery({
    queryKey: reportKeys.deductions(params),
    queryFn: () => apiClient.get<ComponentPivotReport>("/payroll/reports/deductions", params),
    staleTime: 60_000,
  });
}

export function usePayrollReimbursementsReport(params: ReportFilterParams) {
  return useQuery({
    queryKey: reportKeys.reimbursements(params),
    queryFn: () => apiClient.get<ComponentPivotReport>("/payroll/reports/reimbursements", params),
    staleTime: 60_000,
  });
}

export function usePayrollTaxReport(params: ReportFilterParams) {
  return useQuery({
    queryKey: reportKeys.tax(params),
    queryFn: () => apiClient.get<ComponentPivotReport>("/payroll/reports/tax", params),
    staleTime: 60_000,
  });
}

export function usePayrollBankPayout(month: string) {
  return useQuery({
    queryKey: reportKeys.bankPayout(month),
    queryFn: () => apiClient.get<BankPayoutReport>("/payroll/reports/bank-payout", { month }),
    staleTime: 60_000,
  });
}

export function usePayrollVariance(month: string) {
  return useQuery({
    queryKey: reportKeys.variance(month),
    queryFn: () => apiClient.get<VarianceReport>("/payroll/reports/variance", { month }),
    staleTime: 60_000,
  });
}

export function usePayrollJournal(month: string) {
  return useQuery({
    queryKey: reportKeys.journal(month),
    queryFn: () => apiClient.get<JournalReport>("/payroll/reports/journal", { month }),
    staleTime: 60_000,
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-${reportType}-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}

export function useExportJournal() {
  return useMutation({
    mutationKey: ["payroll", "export-journal"],
    mutationFn: async ({ month }: { month: string }) => {
      const blob = await apiClient.download("/payroll/reports/journal", { month, format: "csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-journal-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
