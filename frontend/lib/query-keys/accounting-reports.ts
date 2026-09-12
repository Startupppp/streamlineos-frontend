import { queryKeyBase as base } from "./base";

const root = [...base, "accountingReports"] as const;

export const accountingReportsQueryKeys = {
  accountingReports: {
    all: root,
    trialBalance: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...root, "trialBalance"] as const)
        : ([...root, "trialBalance", params] as const),
    profitLoss: (params?: Record<string, unknown>) =>
      params === undefined ? ([...root, "pnl"] as const) : ([...root, "pnl", params] as const),
    balanceSheet: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...root, "balanceSheet"] as const)
        : ([...root, "balanceSheet", params] as const),
    cashFlow: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...root, "cashFlow"] as const)
        : ([...root, "cashFlow", params] as const),
    aging: (params?: Record<string, unknown>) =>
      params === undefined ? ([...root, "aging"] as const) : ([...root, "aging", params] as const),
    taxSummary: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...root, "taxSummary"] as const)
        : ([...root, "taxSummary", params] as const),
  },
} as const;
