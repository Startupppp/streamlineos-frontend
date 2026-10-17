"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingReportsQueryKeys } from "@/lib/query-keys/accounting-reports";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  AgingParams,
  AgingReport,
  BalanceSheetParams,
  BalanceSheetReport,
  CashFlowReport,
  ProfitLossParams,
  ProfitLossReport,
  ReportKey,
  ReportRangeParams,
  TaxSummaryReport,
  TrialBalanceParams,
  TrialBalanceStatement,
} from "@/types/accounting/accounting-reports";
import type {
  StockGlReconciliation,
  UnpostedMovementsReport,
} from "@/hooks/api/accounting/reconciliation-schema";

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

const REPORT_STALE = 60 * 1000;

const taxSummaryContract = lazyContract(() =>
  import("@/hooks/api/accounting/reports-schema").then(
    (m) => m.taxSummaryReportContract,
  ),
);

const stockGlContract = lazyContract(() =>
  import("@/hooks/api/accounting/reconciliation-schema").then(
    (m) => m.stockGlReconciliationContract,
  ),
);
const unpostedMovementsContract = lazyContract(() =>
  import("@/hooks/api/accounting/reconciliation-schema").then(
    (m) => m.unpostedMovementsContract,
  ),
);

type QueryParams = Record<string, string | number | boolean | undefined>;

function reportParams(input: object): QueryParams {
  const out: QueryParams = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "boolean") out[key] = value ? "true" : "false";
    else if (typeof value === "number") out[key] = value;
    else out[key] = String(value);
  }
  return out;
}

export function useTrialBalanceReport(
  params: TrialBalanceParams,
  options?: QueryOpts<TrialBalanceStatement>,
) {
  const canRead = useCan("accounting:reports:read");
  const search = reportParams(params);
  return useQuery<TrialBalanceStatement, Error>({
    queryKey: accountingReportsQueryKeys.accountingReports.trialBalance(search),
    queryFn: ({ signal }) =>
      apiClient.get<TrialBalanceStatement>(
        "/accounting/reports/trial-balance",
        search,
        signal,
      ),
    staleTime: REPORT_STALE,
    ...options,
    enabled: canRead && !!params.asOf && (options?.enabled ?? true),
  });
}

export function useProfitLossReport(
  params: ProfitLossParams,
  options?: QueryOpts<ProfitLossReport>,
) {
  const canRead = useCan("accounting:reports:read");
  const search = reportParams(params);
  return useQuery<ProfitLossReport, Error>({
    queryKey: accountingReportsQueryKeys.accountingReports.profitLoss(search),
    queryFn: ({ signal }) =>
      apiClient.get<ProfitLossReport>(
        "/accounting/reports/pnl",
        search,
        signal,
      ),
    staleTime: REPORT_STALE,
    ...options,
    enabled:
      canRead && !!params.from && !!params.to && (options?.enabled ?? true),
  });
}

export function useBalanceSheetReport(
  params: BalanceSheetParams,
  options?: QueryOpts<BalanceSheetReport>,
) {
  const canRead = useCan("accounting:reports:read");
  const search = reportParams(params);
  return useQuery<BalanceSheetReport, Error>({
    queryKey: accountingReportsQueryKeys.accountingReports.balanceSheet(search),
    queryFn: ({ signal }) =>
      apiClient.get<BalanceSheetReport>(
        "/accounting/reports/balance-sheet",
        search,
        signal,
      ),
    staleTime: REPORT_STALE,
    ...options,
    enabled: canRead && !!params.asOf && (options?.enabled ?? true),
  });
}

export function useCashFlowReport(
  params: ReportRangeParams,
  options?: QueryOpts<CashFlowReport>,
) {
  const canRead = useCan("accounting:reports:read");
  const search = reportParams(params);
  return useQuery<CashFlowReport, Error>({
    queryKey: accountingReportsQueryKeys.accountingReports.cashFlow(search),
    queryFn: ({ signal }) =>
      apiClient.get<CashFlowReport>(
        "/accounting/reports/cash-flow",
        search,
        signal,
      ),
    staleTime: REPORT_STALE,
    ...options,
    enabled:
      canRead && !!params.from && !!params.to && (options?.enabled ?? true),
  });
}

export function useAgingReport(
  params: AgingParams,
  options?: QueryOpts<AgingReport>,
) {
  const canRead = useCan("accounting:reports:read");
  const search = reportParams(params);
  return useQuery<AgingReport, Error>({
    queryKey: accountingReportsQueryKeys.accountingReports.aging(search),
    queryFn: ({ signal }) =>
      apiClient.get<AgingReport>("/accounting/reports/aging", search, signal),
    staleTime: REPORT_STALE,
    ...options,
    enabled: canRead && !!params.asOf && (options?.enabled ?? true),
  });
}

export function useTaxSummaryReport(
  params: ReportRangeParams,
  options?: QueryOpts<TaxSummaryReport>,
) {
  const canRead = useCan("accounting:reports:read");
  const search = reportParams(params);
  return useQuery<TaxSummaryReport, Error>({
    queryKey: accountingReportsQueryKeys.accountingReports.taxSummary(search),
    queryFn: ({ signal }) =>
      apiClient.get<TaxSummaryReport>(
        "/accounting/reports/tax-summary",
        search,
        signal,
        taxSummaryContract,
      ),
    staleTime: REPORT_STALE,
    ...options,
    enabled:
      canRead && !!params.from && !!params.to && (options?.enabled ?? true),
  });
}

/** Does the general ledger agree with the stock ledger about inventory over a window? */
export function useStockGlReconciliation(
  params: { from: string; to: string },
  options?: QueryOpts<StockGlReconciliation>,
) {
  const canRead = useCan("accounting:reports:read");
  const search = { from: params.from, to: params.to };
  return useQuery<StockGlReconciliation, Error>({
    queryKey: accountingReportsQueryKeys.accountingReports.stockGl(search),
    queryFn: ({ signal }) =>
      apiClient.get<StockGlReconciliation>(
        "/accounting/reconciliation/stock-gl",
        search,
        signal,
        stockGlContract,
      ),
    staleTime: REPORT_STALE,
    ...options,
    enabled: canRead && !!params.from && !!params.to && (options?.enabled ?? true),
  });
}

/** Stock that moved in the window and never reached the ledger. */
export function useUnpostedMovements(
  params: { from: string; to: string },
  options?: QueryOpts<UnpostedMovementsReport>,
) {
  const canRead = useCan("accounting:reports:read");
  const search = { from: params.from, to: params.to };
  return useQuery<UnpostedMovementsReport, Error>({
    queryKey: accountingReportsQueryKeys.accountingReports.unpostedMovements(search),
    queryFn: ({ signal }) =>
      apiClient.get<UnpostedMovementsReport>(
        "/accounting/reconciliation/unposted-movements",
        search,
        signal,
        unpostedMovementsContract,
      ),
    staleTime: REPORT_STALE,
    ...options,
    enabled: canRead && !!params.from && !!params.to && (options?.enabled ?? true),
  });
}

export interface ExportReportInput {
  report: ReportKey;
  params: Record<string, unknown>;
  filename: string;
}

export function useExportReport() {
  return useAuthorizedMutation<void, Error, ExportReportInput>(
    "accounting:reports:export",
    {
      mutationKey: ["accounting", "reports", "export"],
      mutationFn: async ({ report, params, filename }) => {
        const blob = await apiClient.download(
          "/accounting/reports/export",
          reportParams({ ...params, report }),
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      },
    },
  );
}
