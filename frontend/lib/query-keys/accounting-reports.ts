import { queryKeyBase as base } from "./base";

const root = [...base, "accountingReports"] as const;

export const accountingReportsQueryKeys = {
  accountingReports: {
    all: root,
    trialBalance: (params?: Record<string, unknown>) => [...root, "trialBalance", params] as const,
    profitLoss: (params?: Record<string, unknown>) => [...root, "pnl", params] as const,
    balanceSheet: (params?: Record<string, unknown>) => [...root, "balanceSheet", params] as const,
    cashFlow: (params?: Record<string, unknown>) => [...root, "cashFlow", params] as const,
    aging: (params?: Record<string, unknown>) => [...root, "aging", params] as const,
    taxSummary: (params?: Record<string, unknown>) => [...root, "taxSummary", params] as const,
  },
} as const;
