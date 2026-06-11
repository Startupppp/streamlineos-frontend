"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Account,
  AccountType,
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
