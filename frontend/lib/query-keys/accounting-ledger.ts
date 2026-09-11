import { queryKeyBase as base } from "./base";

const root = [...base, "accountingLedger"] as const;

export const accountingLedgerQueryKeys = {
  accountingLedger: {
    all: root,

    setupStatus: () => [...root, "setupStatus"] as const,
    packs: () => [...root, "packs"] as const,
    book: () => [...root, "book"] as const,
    taxRegistrations: () => [...root, "taxRegistrations"] as const,

    accounts: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...root, "accounts"] as const)
        : ([...root, "accounts", params] as const),
    accountsPostable: () => [...root, "accounts", "postable"] as const,
    accountMappings: () => [...root, "accounts", "mappings"] as const,
    account: (accountId: string) => [...root, "account", accountId] as const,
    accountLedger: (accountId: string, params?: Record<string, unknown>) =>
      params === undefined
        ? ([...root, "account", accountId, "ledger"] as const)
        : ([...root, "account", accountId, "ledger", params] as const),

    fiscalYears: () => [...root, "fiscalYears"] as const,
    periods: (params?: Record<string, unknown>) =>
      params === undefined ? ([...root, "periods"] as const) : ([...root, "periods", params] as const),

    journal: (journalId: string) => [...root, "journal", journalId] as const,
    trialBalance: (asOf: string) => [...root, "trialBalance", asOf] as const,

    currencies: () => [...root, "currencies"] as const,
    bookCurrencies: () => [...root, "bookCurrencies"] as const,
    fxRates: (params?: Record<string, unknown>) =>
      params === undefined ? ([...root, "fxRates"] as const) : ([...root, "fxRates", params] as const),
  },
} as const;
