import { queryKeyBase as base } from "./base";

const root = [...base, "accountingLedger"] as const;

export const accountingLedgerQueryKeys = {
  accountingLedger: {
    all: root,

    setupStatus: () => [...root, "setupStatus"] as const,
    packs: () => [...root, "packs"] as const,
    book: () => [...root, "book"] as const,
    books: () => [...root, "books"] as const,
    taxRegistrations: () => [...root, "taxRegistrations"] as const,

    accounts: (params?: Record<string, unknown>) => [...root, "accounts", params] as const,
    accountsPostable: () => [...root, "accounts", "postable"] as const,
    account: (accountId: string) => [...root, "account", accountId] as const,
    accountLedger: (accountId: string, params?: Record<string, unknown>) =>
      [...root, "account", accountId, "ledger", params] as const,

    fiscalYears: () => [...root, "fiscalYears"] as const,
    periods: (params?: Record<string, unknown>) => [...root, "periods", params] as const,

    journal: (journalId: string) => [...root, "journal", journalId] as const,
    journals: (params?: Record<string, unknown>) => [...root, "journals", params] as const,
    trialBalance: (asOf: string) => [...root, "trialBalance", asOf] as const,

    currencies: () => [...root, "currencies"] as const,
    bookCurrencies: () => [...root, "bookCurrencies"] as const,
    fxRates: (params?: Record<string, unknown>) => [...root, "fxRates", params] as const,
  },
} as const;
