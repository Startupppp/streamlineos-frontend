import { queryKeyBase as base } from "./base";

const root = [...base, "accountingBanking"] as const;

export const accountingBankingQueryKeys = {
  accountingBanking: {
    all: root,
    accountsAll: [...root, "accounts"] as const,
    accounts: (params?: Record<string, unknown>) => [...root, "accounts", params] as const,
    account: (bankAccountId: string) => [...root, "account", bankAccountId] as const,
    accountBalance: (bankAccountId: string, asOf?: string) =>
      [...root, "account", bankAccountId, "balance", asOf] as const,
    mappingPresets: () => [...root, "mappingPresets"] as const,
    statementsAll: [...root, "statements"] as const,
    statements: (params?: Record<string, unknown>) => [...root, "statements", params] as const,
    statement: (statementId: string) => [...root, "statement", statementId] as const,
    reconciliation: (statementId: string) =>
      [...root, "statement", statementId, "reconciliation"] as const,
    suggestions: (statementLineId: string) =>
      [...root, "statementLine", statementLineId, "suggestions"] as const,
    unreconciledAll: [...root, "unreconciled"] as const,
    unreconciled: (params?: Record<string, unknown>) => [...root, "unreconciled", params] as const,
  },
} as const;
