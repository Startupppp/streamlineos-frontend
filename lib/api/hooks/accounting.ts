"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Account,
  AccountType,
  AgedReceivablesReport,
  BalanceSheetReport,
  CustomerLedger,
  CustomerOutstanding,
  Gstr1Report,
  JournalEntry,
  ProfitLossReport,
  TrialBalanceRow,
} from "@/types/accounting";

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface TrialBalanceResponse {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: string;
  totalCredit: string;
  balanced: boolean;
}

export interface ListAccountsParams {
  page?: number;
  pageSize?: number;
  q?: string;
  type?: AccountType;
  activeOnly?: boolean;
}

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export function useAccounts(params: ListAccountsParams = {}) {
  return useQuery<ListResponse<Account>, Error>({
    queryKey: queryKeys.accounting.accounts(params),
    queryFn: () =>
      apiClient.get<ListResponse<Account>>("/accounting/accounts", toQuery(params)),
    staleTime: 60_000,
  });
}

interface CreateAccountInput {
  code: string;
  name: string;
  accountType: AccountType;
  description?: string;
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation<Account, Error, CreateAccountInput>({
    mutationFn: (data) => apiClient.post<Account>("/accounting/accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

interface UpdateAccountInput {
  name?: string;
  isActive?: boolean;
  description?: string;
}

export function useUpdateAccount(accountId: number) {
  const queryClient = useQueryClient();
  return useMutation<Account, Error, UpdateAccountInput>({
    mutationFn: (data) => apiClient.patch<Account>(`/accounting/accounts/${accountId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

export interface ListJournalParams {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  sourceType?: string;
}

export function useJournal(params: ListJournalParams = {}) {
  return useQuery<ListResponse<JournalEntry>, Error>({
    queryKey: queryKeys.accounting.journal(params),
    queryFn: () =>
      apiClient.get<ListResponse<JournalEntry>>("/accounting/journal", toQuery(params)),
    staleTime: 30_000,
  });
}

export function useJournalEntry(entryId: number) {
  return useQuery<JournalEntry, Error>({
    queryKey: queryKeys.accounting.journalEntry(entryId),
    queryFn: () => apiClient.get<JournalEntry>(`/accounting/journal/${entryId}`),
    enabled: Number.isInteger(entryId) && entryId > 0,
  });
}

export interface ReverseJournalEntryResult {
  id: number;
  entryNumber: string;
  created: boolean;
}

export function useReverseJournalEntry(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation<ReverseJournalEntryResult, Error, void>({
    mutationFn: () =>
      apiClient.post<ReverseJournalEntryResult>(`/accounting/journal/${entryId}/reverse`),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.journalEntry(entryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.journalEntry(result.id) });
    },
  });
}

export interface CreateJournalEntryLine {
  accountCode: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateJournalEntryInput {
  entryDate: string;
  description: string;
  status: "DRAFT" | "POSTED";
  lines: CreateJournalEntryLine[];
}

interface CreateJournalEntryResult {
  id: number;
  entryNumber: string;
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation<CreateJournalEntryResult, Error, CreateJournalEntryInput>({
    mutationFn: (input) => apiClient.post<CreateJournalEntryResult>("/accounting/journal", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

interface PostJournalEntryResult {
  id: number;
  entryNumber: string;
  status: "DRAFT" | "POSTED" | "VOID";
}

export function usePostJournalEntry(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation<PostJournalEntryResult, Error, void>({
    mutationFn: () => apiClient.post<PostJournalEntryResult>(`/accounting/journal/${entryId}/post`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.journalEntry(entryId) });
    },
  });
}

export function useTrialBalance(asOf: string) {
  return useQuery<TrialBalanceResponse, Error>({
    queryKey: queryKeys.accounting.trialBalance(asOf),
    queryFn: () =>
      apiClient.get<TrialBalanceResponse>("/accounting/reports/trial-balance", { asOf }),
    enabled: !!asOf,
    staleTime: 30_000,
  });
}

export function useProfitLoss(from: string, to: string) {
  return useQuery<ProfitLossReport, Error>({
    queryKey: queryKeys.accounting.profitLoss(from, to),
    queryFn: () =>
      apiClient.get<ProfitLossReport>("/accounting/reports/profit-loss", { from, to }),
    enabled: !!from && !!to,
    staleTime: 30_000,
  });
}

export interface ListCustomersOutstandingParams {
  page?: number;
  pageSize?: number;
  q?: string;
  onlyOutstanding?: boolean;
}

export function useCustomersOutstanding(params: ListCustomersOutstandingParams = {}) {
  return useQuery<ListResponse<CustomerOutstanding>, Error>({
    queryKey: queryKeys.accounting.customersOutstanding(params),
    queryFn: () =>
      apiClient.get<ListResponse<CustomerOutstanding>>("/accounting/customers", toQuery(params)),
    staleTime: 60_000,
  });
}

export interface CustomerLedgerParams {
  from?: string;
  to?: string;
}

export function useCustomerLedger(clientId: number, params: CustomerLedgerParams = {}) {
  return useQuery<CustomerLedger, Error>({
    queryKey: queryKeys.accounting.customerLedger(clientId, params),
    queryFn: () =>
      apiClient.get<CustomerLedger>(`/accounting/customers/${clientId}/ledger`, toQuery(params)),
    enabled: Number.isInteger(clientId) && clientId > 0,
    staleTime: 60_000,
  });
}

export function useGstr1(from: string, to: string) {
  return useQuery<Gstr1Report, Error>({
    queryKey: queryKeys.accounting.gstr1({ from, to }),
    queryFn: () => apiClient.get<Gstr1Report>("/accounting/reports/gstr-1", { from, to }),
    enabled: !!from && !!to,
    staleTime: 30_000,
  });
}

export function useBalanceSheet(asOf: string) {
  return useQuery<BalanceSheetReport, Error>({
    queryKey: queryKeys.accounting.balanceSheet({ asOf }),
    queryFn: () => apiClient.get<BalanceSheetReport>("/accounting/reports/balance-sheet", { asOf }),
    enabled: !!asOf,
    staleTime: 30_000,
  });
}

export function useAgedReceivables(asOf: string) {
  return useQuery<AgedReceivablesReport, Error>({
    queryKey: queryKeys.accounting.agedReceivables({ asOf }),
    queryFn: () => apiClient.get<AgedReceivablesReport>("/accounting/reports/aged-receivables", { asOf }),
    enabled: !!asOf,
    staleTime: 30_000,
  });
}
