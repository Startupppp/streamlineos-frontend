import { queryKeyBase as base } from "./base";

const root = [...base, "accountingBanking"] as const;

export const accountingBankingQueryKeys = {
  accountingBanking: {
    all: root,
    accountsAll: [...root, "accounts"] as const,
    accounts: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...root, "accounts"] as const)
        : ([...root, "accounts", params] as const),
    account: (bankAccountId: string) => [...root, "account", bankAccountId] as const,
    accountBalance: (bankAccountId: string, asOf?: string) =>
      asOf === undefined
        ? ([...root, "account", bankAccountId, "balance"] as const)
        : ([...root, "account", bankAccountId, "balance", asOf] as const),
    mappingPresets: () => [...root, "mappingPresets"] as const,
    statements: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...root, "statements"] as const)
        : ([...root, "statements", params] as const),
    statement: (statementId: string) => [...root, "statement", statementId] as const,
    reconciliation: (statementId: string) =>
      [...root, "statement", statementId, "reconciliation"] as const,
    suggestions: (statementLineId: string) =>
      [...root, "statementLine", statementLineId, "suggestions"] as const,
    unreconciled: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...root, "unreconciled"] as const)
        : ([...root, "unreconciled", params] as const),
  },
} as const;
