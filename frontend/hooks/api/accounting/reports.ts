"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

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

export interface ExpenseByCategoryRow {
  categoryId: number;
  categoryName: string;
  totalAmount: string;
  count: number;
}

export interface TaxSummaryRow {
  month: string;
  outputCgst: string;
  outputSgst: string;
  outputIgst: string;
  inputCgst: string;
  inputSgst: string;
  inputIgst: string;
  netPayable: string;
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
    queryKey: [...queryKeys.accounting.all, "reports", "catalog"],
    queryFn: () => apiClient.get<ReportCatalogItem[]>("/accounting/reports/catalog"),
    staleTime: 300_000,
    enabled: can,
  });
}

export function useCustomerStatement(clientId: number | null, from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<CustomerStatement, Error>({
    queryKey: [...queryKeys.accounting.all, "reports", "customer-statement", clientId, from, to],
    queryFn: () =>
      apiClient.get<CustomerStatement>(
        `/accounting/reports/customer-statement/${clientId}`,
        toQuery({ from, to }),
      ),
    staleTime: 60_000,
    enabled: can && clientId !== null && clientId > 0,
  });
}

export function useVendorStatement(vendorId: number | null, from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<VendorStatement, Error>({
    queryKey: [...queryKeys.accounting.all, "reports", "vendor-statement", vendorId, from, to],
    queryFn: () =>
      apiClient.get<VendorStatement>(
        `/accounting/reports/vendor-statement/${vendorId}`,
        toQuery({ from, to }),
      ),
    staleTime: 60_000,
    enabled: can && vendorId !== null && vendorId > 0,
  });
}

export function useSalesByCustomer(from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<SalesByCustomerRow[], Error>({
    queryKey: [...queryKeys.accounting.all, "reports", "sales-by-customer", from, to],
    queryFn: () =>
      apiClient.get<SalesByCustomerRow[]>(
        "/accounting/reports/sales-by-customer",
        toQuery({ from, to }),
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useSalesByItem(from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<SalesByItemRow[], Error>({
    queryKey: [...queryKeys.accounting.all, "reports", "sales-by-item", from, to],
    queryFn: () =>
      apiClient.get<SalesByItemRow[]>(
        "/accounting/reports/sales-by-item",
        toQuery({ from, to }),
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useExpenseByCategory(from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<ExpenseByCategoryRow[], Error>({
    queryKey: [...queryKeys.accounting.all, "reports", "expense-by-category", from, to],
    queryFn: () =>
      apiClient.get<ExpenseByCategoryRow[]>(
        "/accounting/reports/expense-by-category",
        toQuery({ from, to }),
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useTaxSummary(from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<TaxSummaryRow[], Error>({
    queryKey: [...queryKeys.accounting.all, "reports", "tax-summary", from, to],
    queryFn: () =>
      apiClient.get<TaxSummaryRow[]>(
        "/accounting/reports/tax-summary",
        toQuery({ from, to }),
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useProjectProfitability(from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<ProfitabilityRow[], Error>({
    queryKey: [...queryKeys.accounting.all, "reports", "project-profitability", from, to],
    queryFn: () =>
      apiClient.get<ProfitabilityRow[]>(
        "/accounting/reports/project-profitability",
        toQuery({ from, to }),
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useDepartmentProfitability(from?: string, to?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<ProfitabilityRow[], Error>({
    queryKey: [...queryKeys.accounting.all, "reports", "department-profitability", from, to],
    queryFn: () =>
      apiClient.get<ProfitabilityRow[]>(
        "/accounting/reports/department-profitability",
        toQuery({ from, to }),
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useWorkingCapital(asOf?: string) {
  const can = useCan("accounting:reports:read");
  return useQuery<WorkingCapital, Error>({
    queryKey: [...queryKeys.accounting.all, "reports", "working-capital", asOf],
    queryFn: () =>
      apiClient.get<WorkingCapital>(
        "/accounting/reports/working-capital",
        toQuery({ asOf }),
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useBurnRate() {
  const can = useCan("accounting:reports:read");
  return useQuery<BurnRateReport, Error>({
    queryKey: [...queryKeys.accounting.all, "reports", "burn-rate"],
    queryFn: () => apiClient.get<BurnRateReport>("/accounting/reports/burn-rate"),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCashRunway() {
  const can = useCan("accounting:reports:read");
  return useQuery<CashRunwayReport, Error>({
    queryKey: [...queryKeys.accounting.all, "reports", "cash-runway"],
    queryFn: () => apiClient.get<CashRunwayReport>("/accounting/reports/cash-runway"),
    staleTime: 60_000,
    enabled: can,
  });
}
