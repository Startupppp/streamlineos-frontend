"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accountingLedgerQueryKeys } from "@/lib/query-keys/accounting-ledger";
import { useCan } from "@/hooks/api/access";
import type {
  AccountLedger,
  AccountNode,
  AccountingBook,
  AccountingPeriod,
  FiscalYear,
  Journal,
  LocalizationPackSummary,
  PostableAccount,
  TrialBalanceReport,
} from "@/types/accounting-kernel";
import type {
  AccountSystemTagMapping,
  AccountingSetupStatus,
  BookCurrency,
  Currency,
  FxRate,
  TaxRegistration,
} from "@/types/accounting-kernel-ext";

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

const CATALOG_STALE = 30 * 60 * 1000;
const SESSION_STALE = 5 * 60 * 1000;
const SLOW_LIST_STALE = 2 * 60 * 1000;
const ENTITY_STALE = 60 * 1000;

export function useAccountingSetupStatus(options?: QueryOpts<AccountingSetupStatus>) {
  const canRead = useCan("accounting:settings:read");
  return useQuery<AccountingSetupStatus, Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.setupStatus(),
    queryFn: ({ signal }) =>
      apiClient.get<AccountingSetupStatus>("/accounting/setup/status", undefined, signal),
    staleTime: SESSION_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useLocalizationPacks(options?: QueryOpts<LocalizationPackSummary[]>) {
  const canRead = useCan("accounting:settings:read");
  return useQuery<LocalizationPackSummary[], Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.packs(),
    queryFn: ({ signal }) =>
      apiClient.get<LocalizationPackSummary[]>("/accounting/packs", undefined, signal),
    staleTime: CATALOG_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useAccountingBook(options?: QueryOpts<AccountingBook>) {
  const canRead = useCan("accounting:read");
  return useQuery<AccountingBook, Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.book(),
    queryFn: ({ signal }) => apiClient.get<AccountingBook>("/accounting/book", undefined, signal),
    staleTime: SESSION_STALE,
    retry: false,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useChartOfAccounts(
  params: { includeInactive?: boolean } = {},
  options?: QueryOpts<AccountNode[]>,
) {
  const canRead = useCan("accounting:accounts:read");
  return useQuery<AccountNode[], Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.accounts(params),
    queryFn: ({ signal }) =>
      apiClient.get<AccountNode[]>(
        "/accounting/accounts",
        params.includeInactive ? { includeInactive: "true" } : undefined,
        signal,
      ),
    staleTime: SLOW_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function usePostableAccounts(options?: QueryOpts<PostableAccount[]>) {
  const canRead = useCan("accounting:accounts:read");
  return useQuery<PostableAccount[], Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.accountsPostable(),
    queryFn: ({ signal }) =>
      apiClient.get<PostableAccount[]>("/accounting/accounts/postable", undefined, signal),
    staleTime: SLOW_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useAccountMappings(options?: QueryOpts<AccountSystemTagMapping[]>) {
  const canRead = useCan("accounting:accounts:read");
  return useQuery<AccountSystemTagMapping[], Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.accountMappings(),
    queryFn: ({ signal }) =>
      apiClient.get<AccountSystemTagMapping[]>("/accounting/accounts/mappings", undefined, signal),
    staleTime: CATALOG_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useFiscalYears(options?: QueryOpts<FiscalYear[]>) {
  const canRead = useCan("accounting:periods:read");
  return useQuery<FiscalYear[], Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.fiscalYears(),
    queryFn: ({ signal }) => apiClient.get<FiscalYear[]>("/accounting/fiscal-years", undefined, signal),
    staleTime: SLOW_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useAccountingPeriods(
  params: { fiscalYearId?: string } = {},
  options?: QueryOpts<AccountingPeriod[]>,
) {
  const canRead = useCan("accounting:periods:read");
  return useQuery<AccountingPeriod[], Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.periods(params),
    queryFn: ({ signal }) =>
      apiClient.get<AccountingPeriod[]>(
        "/accounting/periods",
        params.fiscalYearId ? { fiscalYearId: params.fiscalYearId } : undefined,
        signal,
      ),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useJournal(journalId: string, options?: QueryOpts<Journal>) {
  const canRead = useCan("accounting:journal:read");
  return useQuery<Journal, Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.journal(journalId),
    queryFn: ({ signal }) =>
      apiClient.get<Journal>(`/accounting/journals/${journalId}`, undefined, signal),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!journalId && (options?.enabled ?? true),
  });
}

export function useTrialBalance(asOf: string, options?: QueryOpts<TrialBalanceReport>) {
  const canRead = useCan("accounting:reports:read");
  return useQuery<TrialBalanceReport, Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.trialBalance(asOf),
    queryFn: ({ signal }) =>
      apiClient.get<TrialBalanceReport>("/accounting/trial-balance", { asOf }, signal),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!asOf && (options?.enabled ?? true),
  });
}

export interface AccountLedgerParams {
  from: string;
  to: string;
  page?: number;
  pageSize?: number;
}

export function useAccountLedger(
  accountId: string,
  params: AccountLedgerParams,
  options?: QueryOpts<AccountLedger>,
) {
  const canRead = useCan("accounting:general-ledger:read");
  const search: Record<string, string | number> = {
    from: params.from,
    to: params.to,
    ...(params.page ? { page: params.page } : {}),
    ...(params.pageSize ? { pageSize: params.pageSize } : {}),
  };
  return useQuery<AccountLedger, Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.accountLedger(accountId, search),
    queryFn: ({ signal }) =>
      apiClient.get<AccountLedger>(`/accounting/accounts/${accountId}/ledger`, search, signal),
    staleTime: ENTITY_STALE,
    ...options,
    enabled:
      canRead && !!accountId && !!params.from && !!params.to && (options?.enabled ?? true),
  });
}

export function useCurrencies(options?: QueryOpts<Currency[]>) {
  const canRead = useCan("accounting:read");
  return useQuery<Currency[], Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.currencies(),
    queryFn: ({ signal }) => apiClient.get<Currency[]>("/accounting/currencies", undefined, signal),
    staleTime: CATALOG_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useBookCurrencies(options?: QueryOpts<BookCurrency[]>) {
  const canRead = useCan("accounting:read");
  return useQuery<BookCurrency[], Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.bookCurrencies(),
    queryFn: ({ signal }) =>
      apiClient.get<BookCurrency[]>("/accounting/book-currencies", undefined, signal),
    staleTime: SESSION_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useFxRates(
  params: { from?: string; to?: string } = {},
  options?: QueryOpts<FxRate[]>,
) {
  const canRead = useCan("accounting:read");
  return useQuery<FxRate[], Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.fxRates(params),
    queryFn: ({ signal }) =>
      apiClient.get<FxRate[]>(
        "/accounting/fx-rates",
        Object.keys(params).length > 0 ? params : undefined,
        signal,
      ),
    staleTime: SLOW_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useTaxRegistrations(options?: QueryOpts<TaxRegistration[]>) {
  const canRead = useCan("accounting:settings:read");
  return useQuery<TaxRegistration[], Error>({
    queryKey: accountingLedgerQueryKeys.accountingLedger.taxRegistrations(),
    queryFn: ({ signal }) =>
      apiClient.get<TaxRegistration[]>("/accounting/setup/tax-registrations", undefined, signal),
    staleTime: SESSION_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}
