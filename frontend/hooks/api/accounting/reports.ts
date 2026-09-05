"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useCan } from "@/hooks/api/access";
import {
  expenseByCategoryContract,
  taxSummaryContract,
  type ExpenseByCategoryRow,
  type TaxSummaryRow,
} from "@/hooks/api/accounting/reports-schema";
export type { ExpenseByCategoryRow, TaxSummaryRow };

export interface ReportCatalogItem {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  params: readonly string[];
  category: string;
  exportable: boolean;
}

export interface StatementLine {
  date: string;
  docType: string;
  docNumber: string;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface CustomerStatement {
  client: { id: number; name: string };
  openingBalance: string;
  lines: StatementLine[];
  closingBalance: string;
}

export interface VendorStatement {
  vendor: { id: number; name: string };
  openingBalance: string;
  lines: StatementLine[];
  closingBalance: string;
}

export interface SalesByCustomerRow {
  clientId: number;
  clientName: string;
  invoiceCount: number;
  totalBilled: string;
  totalPaid: string;
  outstanding: string;
}

export interface SalesByItemRow {
  description: string;
  totalQuantity: number;
  totalAmount: string;
  invoiceCount: number;
}

export interface ProfitabilityRow {
  projectId?: number;
  projectName?: string;
  departmentId?: number;
  departmentName?: string;
  revenue: string;
  cost: string;
  margin: string;
  marginPct: number;
}

export interface WorkingCapital {
  asOf: string;
  currentAssets: string;
  currentLiabilities: string;
  workingCapital: string;
  ratio: number;
}

export interface BurnRateReport {
  months: Array<{ month: string; netOutflow: string }>;
  averageBurnRate: string;
}

export interface CashRunwayReport {
  cashBalance: string;
  averageBurnRate: string;
  runwayMonths: number | null;
  projectedMonths: Array<{ month: string; projectedBalance: string }>;
}

function toQuery(params: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

export function useReportsCatalog() {
  const can = useCan("accounting:reports:read");
  return useQuery<ReportCatalogItem[], Error>({
    queryKey: [...accountingAndSupportQueryKeys.accounting.all, "reports", "catalog"],
    queryFn: ({ signal }) => apiClient.get<ReportCatalogItem[]>("/accounting/reports/catalog", undefined, signal),
    staleTime: 300_000,
    enabled: can,
  });
}

export function useCustomerStatement(clientId: number | null, from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<CustomerStatement, Error>({
    queryKey: [...accountingAndSupportQueryKeys.accounting.all, "reports", "customer-statement", clientId, from, to],
    queryFn: ({ signal }) =>
      apiClient.get<CustomerStatement>(
        `/accounting/reports/customer-statement/${clientId}`,
        toQuery({ from, to }), signal,
      ),
    staleTime: 60_000,
    enabled: can && clientId !== null && clientId > 0,
  });
}

export function useVendorStatement(vendorId: number | null, from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<VendorStatement, Error>({
    queryKey: [...accountingAndSupportQueryKeys.accounting.all, "reports", "vendor-statement", vendorId, from, to],
    queryFn: ({ signal }) =>
      apiClient.get<VendorStatement>(
        `/accounting/reports/vendor-statement/${vendorId}`,
        toQuery({ from, to }), signal,
      ),
    staleTime: 60_000,
    enabled: can && vendorId !== null && vendorId > 0,
  });
}

export function useSalesByCustomer(from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<SalesByCustomerRow[], Error>({
    queryKey: [...accountingAndSupportQueryKeys.accounting.all, "reports", "sales-by-customer", from, to],
    queryFn: ({ signal }) =>
      apiClient.get<SalesByCustomerRow[]>(
        "/accounting/reports/sales-by-customer",
        toQuery({ from, to }), signal,
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useSalesByItem(from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<SalesByItemRow[], Error>({
    queryKey: [...accountingAndSupportQueryKeys.accounting.all, "reports", "sales-by-item", from, to],
    queryFn: ({ signal }) =>
      apiClient.get<SalesByItemRow[]>(
        "/accounting/reports/sales-by-item",
        toQuery({ from, to }), signal,
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

/** `from` and `to` are required and the query DTO is `.strict()`, so a read without both 400s. */
export function useExpenseByCategory(from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<ExpenseByCategoryRow[], Error>({
    queryKey: [...accountingAndSupportQueryKeys.accounting.all, "reports", "expense-by-category", from, to],
    queryFn: ({ signal }) =>
      apiClient.get(
        "/accounting/reports/expense-by-category",
        toQuery({ from, to }), signal, expenseByCategoryContract,
      ),
    staleTime: 60_000,
    enabled: can && !!from && !!to,
  });
}

export function useTaxSummary(from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<TaxSummaryRow[], Error>({
    queryKey: [...accountingAndSupportQueryKeys.accounting.all, "reports", "tax-summary", from, to],
    queryFn: ({ signal }) =>
      apiClient.get(
        "/accounting/reports/tax-summary",
        toQuery({ from, to }), signal, taxSummaryContract,
      ),
    staleTime: 60_000,
    enabled: can && !!from && !!to,
  });
}

export function useProjectProfitability(from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<ProfitabilityRow[], Error>({
    queryKey: [...accountingAndSupportQueryKeys.accounting.all, "reports", "project-profitability", from, to],
    queryFn: ({ signal }) =>
      apiClient.get<ProfitabilityRow[]>(
        "/accounting/reports/project-profitability",
        toQuery({ from, to }), signal,
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useDepartmentProfitability(from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<ProfitabilityRow[], Error>({
    queryKey: [...accountingAndSupportQueryKeys.accounting.all, "reports", "department-profitability", from, to],
    queryFn: ({ signal }) =>
      apiClient.get<ProfitabilityRow[]>(
        "/accounting/reports/department-profitability",
        toQuery({ from, to }), signal,
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useWorkingCapital(asOf?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<WorkingCapital, Error>({
    queryKey: [...accountingAndSupportQueryKeys.accounting.all, "reports", "working-capital", asOf],
    queryFn: ({ signal }) =>
      apiClient.get<WorkingCapital>(
        "/accounting/reports/working-capital",
        toQuery({ asOf }), signal,
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useBurnRate() {
  const can = useCan("accounting:reports:read");
  return useQuery<BurnRateReport, Error>({
    queryKey: [...accountingAndSupportQueryKeys.accounting.all, "reports", "burn-rate"],
    queryFn: ({ signal }) => apiClient.get<BurnRateReport>("/accounting/reports/burn-rate", undefined, signal),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCashRunway() {
  const can = useCan("accounting:reports:read");
  return useQuery<CashRunwayReport, Error>({
    queryKey: [...accountingAndSupportQueryKeys.accounting.all, "reports", "cash-runway"],
    queryFn: ({ signal }) => apiClient.get<CashRunwayReport>("/accounting/reports/cash-runway", undefined, signal),
    staleTime: 60_000,
    enabled: can,
  });
}
