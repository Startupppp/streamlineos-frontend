"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  AccountLedger,
  AccountNode,
  AccountingBook,
  AccountingPeriod,
  AccountingSetupStatus,
  BookCurrency,
  Currency,
  EnableAccountingResult,
  FiscalYear,
  FxPreview,
  FxRate,
  GlAccountType,
  GlJournalSource,
  GlSystemTag,
  Journal,
  LocalizationPackSummary,
  PostableAccount,
  TaxRegistration,
  TaxRegime,
  TrialBalanceReport,
} from "@/types/accounting-kernel";

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

const CATALOG_STALE = 30 * 60 * 1000;
const SESSION_STALE = 5 * 60 * 1000;
const SLOW_LIST_STALE = 2 * 60 * 1000;
const ENTITY_STALE = 60 * 1000;

export interface EnableAccountingInput {
  countryCode: string;
  baseCurrency?: string;
  packCode?: string;
  name?: string;
  legalEntityId?: string;
  openFrom?: string;
}

export interface CreateAccountInput {
  code: string;
  name: string;
  accountType: GlAccountType;
  parentAccountId?: string | null;
  isHeader?: boolean;
  isCash?: boolean;
  systemTag?: GlSystemTag | null;
  currencyRestriction?: string | null;
  description?: string | null;
}

export interface UpdateAccountInput {
  name?: string;
  parentAccountId?: string | null;
  isActive?: boolean;
  isCash?: boolean;
  currencyRestriction?: string | null;
  description?: string | null;
}

export interface PostJournalLineInput {
  accountId: string;
  debitMinor?: number;
  creditMinor?: number;
  txnCurrency?: string;
  txnAmountMinor?: number;
  fxRate?: string;
  partyId?: string;
  description?: string;
  dimensionProjectId?: number;
  dimensionBranchId?: string;
}

export interface PostJournalInput {
  idempotencyKey: string;
  journalDate: string;
  memo?: string;
  sourceType?: GlJournalSource;
  sourceId?: string;
  lines: PostJournalLineInput[];
}

export function useAccountingSetupStatus(options?: QueryOpts<AccountingSetupStatus>) {
  const canRead = useCan("accounting:settings:read");
  return useQuery<AccountingSetupStatus, Error>({
    queryKey: queryKeys.accountingLedger.setupStatus(),
    queryFn: () => apiClient.get<AccountingSetupStatus>("/accounting/setup/status"),
    staleTime: SESSION_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useLocalizationPacks(options?: QueryOpts<LocalizationPackSummary[]>) {
  const canRead = useCan("accounting:settings:read");
  return useQuery<LocalizationPackSummary[], Error>({
    queryKey: queryKeys.accountingLedger.packs(),
    queryFn: () => apiClient.get<LocalizationPackSummary[]>("/accounting/packs"),
    staleTime: CATALOG_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useAccountingBook(options?: QueryOpts<AccountingBook>) {
  const canRead = useCan("accounting:read");
  return useQuery<AccountingBook, Error>({
    queryKey: queryKeys.accountingLedger.book(),
    queryFn: () => apiClient.get<AccountingBook>("/accounting/book"),
    staleTime: SESSION_STALE,
    retry: false,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useEnableAccounting() {
  const queryClient = useQueryClient();
  return useMutation<EnableAccountingResult, Error, EnableAccountingInput>({
    mutationKey: ["accounting", "enable"],
    mutationFn: (input) =>
      apiClient.post<EnableAccountingResult>("/accounting/setup/enable", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.all });
    },
  });
}

export function useChartOfAccounts(
  params: { includeInactive?: boolean } = {},
  options?: QueryOpts<AccountNode[]>,
) {
  const canRead = useCan("accounting:accounts:read");
  return useQuery<AccountNode[], Error>({
    queryKey: queryKeys.accountingLedger.accounts(params),
    queryFn: () =>
      apiClient.get<AccountNode[]>(
        "/accounting/accounts",
        params.includeInactive ? { includeInactive: "true" } : undefined,
      ),
    staleTime: SLOW_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function usePostableAccounts(options?: QueryOpts<PostableAccount[]>) {
  const canRead = useCan("accounting:accounts:read");
  return useQuery<PostableAccount[], Error>({
    queryKey: queryKeys.accountingLedger.accountsPostable(),
    queryFn: () => apiClient.get<PostableAccount[]>("/accounting/accounts/postable"),
    staleTime: SLOW_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation<AccountNode, Error, CreateAccountInput>({
    mutationKey: ["accounting", "accounts", "create"],
    mutationFn: (input) => apiClient.post<AccountNode>("/accounting/accounts", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.all });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation<AccountNode, Error, { accountId: string; input: UpdateAccountInput }>({
    mutationKey: ["accounting", "accounts", "update"],
    mutationFn: ({ accountId, input }) =>
      apiClient.patch<AccountNode>(`/accounting/accounts/${accountId}`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.accounts() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accountingLedger.account(variables.accountId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.accountsPostable() });
    },
  });
}

export function useArchiveAccount() {
  const queryClient = useQueryClient();
  return useMutation<{ deactivatedInsteadOfDeleted: boolean; postings: number }, Error, string>({
    mutationKey: ["accounting", "accounts", "archive"],
    mutationFn: (accountId) =>
      apiClient.delete<{ deactivatedInsteadOfDeleted: boolean; postings: number }>(
        `/accounting/accounts/${accountId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.all });
    },
  });
}

export function useFiscalYears(options?: QueryOpts<FiscalYear[]>) {
  const canRead = useCan("accounting:periods:read");
  return useQuery<FiscalYear[], Error>({
    queryKey: queryKeys.accountingLedger.fiscalYears(),
    queryFn: () => apiClient.get<FiscalYear[]>("/accounting/fiscal-years"),
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
    queryKey: queryKeys.accountingLedger.periods(params),
    queryFn: () =>
      apiClient.get<AccountingPeriod[]>(
        "/accounting/periods",
        params.fiscalYearId ? { fiscalYearId: params.fiscalYearId } : undefined,
      ),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useLockPeriod() {
  const queryClient = useQueryClient();
  return useMutation<AccountingPeriod, Error, { periodId: string; reason?: string }>({
    mutationKey: ["accounting", "periods", "lock"],
    mutationFn: ({ periodId, reason }) =>
      apiClient.post<AccountingPeriod>(`/accounting/periods/${periodId}/lock`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.periods() });
    },
  });
}

export function useUnlockPeriod() {
  const queryClient = useQueryClient();
  return useMutation<AccountingPeriod, Error, { periodId: string; reason: string }>({
    mutationKey: ["accounting", "periods", "unlock"],
    mutationFn: ({ periodId, reason }) =>
      apiClient.post<AccountingPeriod>(`/accounting/periods/${periodId}/unlock`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.periods() });
    },
  });
}

export function useOpenNextFiscalYear() {
  const queryClient = useQueryClient();
  return useMutation<FiscalYear, Error, void>({
    mutationKey: ["accounting", "fiscalYears", "openNext"],
    mutationFn: () => apiClient.post<FiscalYear>("/accounting/fiscal-years/open-next", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.fiscalYears() });
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.periods() });
    },
  });
}

export function useJournal(journalId: string, options?: QueryOpts<Journal>) {
  const canRead = useCan("accounting:journal:read");
  return useQuery<Journal, Error>({
    queryKey: queryKeys.accountingLedger.journal(journalId),
    queryFn: () => apiClient.get<Journal>(`/accounting/journals/${journalId}`),
    staleTime: ENTITY_STALE,
    ...options,
    enabled: canRead && !!journalId && (options?.enabled ?? true),
  });
}

export function usePostJournal() {
  const queryClient = useQueryClient();
  return useMutation<Journal, Error, PostJournalInput>({
    mutationKey: ["accounting", "journals", "post"],
    mutationFn: (input) => apiClient.post<Journal>("/accounting/journals/post", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.all });
    },
  });
}

export function useReverseJournal() {
  const queryClient = useQueryClient();
  return useMutation<
    Journal,
    Error,
    { journalId: string; idempotencyKey: string; journalDate?: string; memo?: string }
  >({
    mutationKey: ["accounting", "journals", "reverse"],
    mutationFn: ({ journalId, ...body }) =>
      apiClient.post<Journal>(`/accounting/journals/${journalId}/reverse`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.all });
    },
  });
}

export function useTrialBalance(asOf: string, options?: QueryOpts<TrialBalanceReport>) {
  const canRead = useCan("accounting:reports:read");
  return useQuery<TrialBalanceReport, Error>({
    queryKey: queryKeys.accountingLedger.trialBalance(asOf),
    queryFn: () =>
      apiClient.get<TrialBalanceReport>("/accounting/trial-balance", { asOf }),
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
    queryKey: queryKeys.accountingLedger.accountLedger(accountId, search),
    // Params are the SECOND positional argument; `{ params }` would serialise to
    // `?params=[object Object]` and every accounting endpoint is `.strict()`.
    queryFn: () =>
      apiClient.get<AccountLedger>(`/accounting/accounts/${accountId}/ledger`, search),
    staleTime: ENTITY_STALE,
    ...options,
    enabled:
      canRead && !!accountId && !!params.from && !!params.to && (options?.enabled ?? true),
  });
}

export function useCurrencies(options?: QueryOpts<Currency[]>) {
  const canRead = useCan("accounting:read");
  return useQuery<Currency[], Error>({
    queryKey: queryKeys.accountingLedger.currencies(),
    queryFn: () => apiClient.get<Currency[]>("/accounting/currencies"),
    staleTime: CATALOG_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useBookCurrencies(options?: QueryOpts<BookCurrency[]>) {
  const canRead = useCan("accounting:read");
  return useQuery<BookCurrency[], Error>({
    queryKey: queryKeys.accountingLedger.bookCurrencies(),
    queryFn: () => apiClient.get<BookCurrency[]>("/accounting/book-currencies"),
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
    queryKey: queryKeys.accountingLedger.fxRates(params),
    // Undefined rather than `{}` so a strict endpoint sees no unknown keys.
    queryFn: () =>
      apiClient.get<FxRate[]>(
        "/accounting/fx-rates",
        Object.keys(params).length > 0 ? params : undefined,
      ),
    staleTime: SLOW_LIST_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useUpsertFxRate() {
  const queryClient = useQueryClient();
  return useMutation<
    FxRate,
    Error,
    { fromCode: string; toCode: string; rateDate: string; rate: string; source?: string }
  >({
    mutationKey: ["accounting", "fxRates", "upsert"],
    mutationFn: (input) => apiClient.post<FxRate>("/accounting/fx-rates", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.fxRates() });
    },
  });
}

export function usePreviewFx() {
  return useMutation<
    FxPreview,
    Error,
    { amountMinor: number; fromCode: string; toCode: string; onDate: string }
  >({
    mutationKey: ["accounting", "fx", "preview"],
    mutationFn: (input) => apiClient.post<FxPreview>("/accounting/fx/preview", input),
  });
}

export interface OpeningBalanceLineInput {
  accountId: string;
  /** Signed: positive debits the account, negative credits it. Minor units. */
  amountMinor: number;
}

export interface OpeningBalancesInput {
  asOfDate: string;
  lines: OpeningBalanceLineInput[];
  memo?: string;
}

export interface OpeningBalancesPreview {
  asOfDate: string;
  journalDate: string;
  totalDebitMinor: number;
  totalCreditMinor: number;
  differenceMinor: number;
  balancingAccountCode: string | null;
  currency: string;
  alreadyPosted: boolean;
}

export function usePreviewOpeningBalances() {
  return useMutation<OpeningBalancesPreview, Error, OpeningBalancesInput>({
    mutationKey: ["accounting", "openingBalances", "preview"],
    mutationFn: (input) =>
      apiClient.post<OpeningBalancesPreview>("/accounting/setup/opening-balances/preview", input),
  });
}

export function usePostOpeningBalances() {
  const queryClient = useQueryClient();
  return useMutation<Journal, Error, OpeningBalancesInput>({
    mutationKey: ["accounting", "openingBalances", "post"],
    mutationFn: (input) => apiClient.post<Journal>("/accounting/setup/opening-balances", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.all });
    },
  });
}

export function useTaxRegistrations(options?: QueryOpts<TaxRegistration[]>) {
  const canRead = useCan("accounting:settings:read");
  return useQuery<TaxRegistration[], Error>({
    queryKey: queryKeys.accountingLedger.taxRegistrations(),
    queryFn: () => apiClient.get<TaxRegistration[]>("/accounting/setup/tax-registrations"),
    staleTime: SESSION_STALE,
    ...options,
    enabled: canRead && (options?.enabled ?? true),
  });
}

export function useAddTaxRegistration() {
  const queryClient = useQueryClient();
  return useMutation<
    TaxRegistration,
    Error,
    { regime: TaxRegime; number: string; region?: string | null; countryCode: string; isPrimary?: boolean }
  >({
    mutationKey: ["accounting", "taxRegistrations", "add"],
    mutationFn: (input) =>
      apiClient.post<TaxRegistration>("/accounting/setup/tax-registrations", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.taxRegistrations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.accountingLedger.setupStatus() });
    },
  });
}
