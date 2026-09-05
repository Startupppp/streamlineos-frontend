"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PeriodStatus } from "@/features/accounting/shared";
import { useCan } from "@/hooks/api/access";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { coreKeys } from "./core-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface AccountingPeriod {
  id: number;
  orgId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  closedBy: string | null;
  closedAt: string | null;
}

export interface PeriodChecklistItem {
  passed: boolean;
  count: number;
}

export interface PeriodChecklist {
  period: AccountingPeriod;
  checklist: {
    noDraftJournals: PeriodChecklistItem;
    noDraftBills: PeriodChecklistItem;
    noUnreconciledTransactions: PeriodChecklistItem;
    noPendingApprovals: PeriodChecklistItem;
  };
  canClose: boolean;
}

export interface OpeningBalanceLine {
  id: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
}

export interface OpeningBalanceEntry {
  id: number;
  entryNumber: string;
  entryDate: string;
  status: string;
  description: string | null;
  createdAt: string;
  lines: OpeningBalanceLine[];
}

export interface OpeningBalanceResponse {
  posted: boolean;
  entry: OpeningBalanceEntry | null;
}

export interface PostOpeningBalancesInput {
  asOfDate: string;
  lines: Array<{ accountId: number; debit?: number; credit?: number }>;
}

export function usePeriods() {
  const can = useCan("accounting:periods:read");
  return useQuery<AccountingPeriod[], Error>({
    queryKey: coreKeys.periods(),
    queryFn: ({ signal }) => apiClient.get<AccountingPeriod[]>("/accounting/periods", undefined, signal),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useGeneratePeriods() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ created: number; total: number }, Error, { year: number }>("accounting:periods:manage", {
    mutationKey: [...coreKeys.all, "generate-periods"],
    mutationFn: (body) =>
      apiClient.post<{ created: number; total: number }>("/accounting/periods", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}

export function usePeriodChecklist(periodId: number, enabled: boolean) {
  const can = useCan("accounting:periods:read");
  return useQuery<PeriodChecklist, Error>({
    queryKey: coreKeys.periodChecklist(periodId),
    queryFn: ({ signal }) =>
      apiClient.get<PeriodChecklist>(`/accounting/periods/${periodId}/close-checklist`, undefined, signal),
    staleTime: 30_000,
    enabled: can && enabled && Number.isInteger(periodId) && periodId > 0,
  });
}

export function useClosePeriod(periodId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AccountingPeriod, Error, void>("accounting:periods:manage", {
    mutationKey: [...coreKeys.all, "close-period", periodId],
    mutationFn: () =>
      apiClient.post<AccountingPeriod>(`/accounting/periods/${periodId}/close`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}

export function useLockPeriod(periodId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AccountingPeriod, Error, void>("accounting:periods:manage", {
    mutationKey: [...coreKeys.all, "lock-period", periodId],
    mutationFn: () =>
      apiClient.post<AccountingPeriod>(`/accounting/periods/${periodId}/lock`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}

export function useReopenPeriod(periodId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<AccountingPeriod, Error, void>("accounting:periods:reopen", {
    mutationKey: [...coreKeys.all, "reopen-period", periodId],
    mutationFn: () =>
      apiClient.post<AccountingPeriod>(`/accounting/periods/${periodId}/reopen`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}

export function useOpeningBalance() {
  const can = useCan("accounting:journal:read");
  return useQuery<OpeningBalanceResponse, Error>({
    queryKey: coreKeys.openingBalance(),
    queryFn: ({ signal }) => apiClient.get<OpeningBalanceResponse>("/accounting/opening-balances", undefined, signal),
    staleTime: 60_000,
    enabled: can,
  });
}

export function usePostOpeningBalances() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ reimported: boolean }, Error, PostOpeningBalancesInput>("accounting:journal:create", {
    mutationKey: [...coreKeys.all, "post-opening-balances"],
    mutationFn: (body) =>
      apiClient.post<{ reimported: boolean }>("/accounting/opening-balances", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.accounting.all });
    },
  });
}
