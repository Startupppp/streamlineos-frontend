"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PeriodStatus } from "@/features/accounting/shared";

const coreKeys = {
  all: ["streamlineos", "accounting", "core"] as const,
  coaTree: () => [...coreKeys.all, "coa-tree"] as const,
  coaTemplates: () => [...coreKeys.all, "coa-templates"] as const,
  setupStatus: () => [...coreKeys.all, "setup-status"] as const,
  gl: (params: Record<string, unknown>) => [...coreKeys.all, "gl", params] as const,
  glAccounts: (params: Record<string, unknown>) => [...coreKeys.all, "gl-accounts", params] as const,
  periods: () => [...coreKeys.all, "periods"] as const,
  period: (id: number) => [...coreKeys.all, "periods", id] as const,
  periodChecklist: (id: number) => [...coreKeys.all, "period-checklist", id] as const,
  openingBalance: () => [...coreKeys.all, "opening-balance"] as const,
  recurringJournals: (params: Record<string, unknown>) => [...coreKeys.all, "recurring-journals", params] as const,
};

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export interface AccountTreeNode {
  id: number;
  code: string;
  name: string;
  accountType: string;
  normalBalance: string | null;
  isSystem: boolean;
  isActive: boolean;
  description: string | null;
  parentAccountId: number | null;
  hasActivity: boolean;
  children: AccountTreeNode[];
}

export interface CoaTemplate {
  key: string;
  label: string;
  country: string;
  accountCount: number;
}

export interface SetupStep {
  key: string;
  label: string;
  done: boolean;
}

export interface GlRow {
  entryId?: number;
  entryNumber: string;
  date: string;
  description: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface GlResponse {
  openingBalance: string;
  closingBalance: string;
  rows: GlRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GlAccount {
  id: number;
  code: string;
  name: string;
  accountType: string;
  totalDebit: string;
  totalCredit: string;
}

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

export interface RecurringJournalLine {
  accountId: number;
  debit: number;
  credit: number;
  description?: string;
}

export type RecurringFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface RecurringJournal {
  id: number;
  name: string;
  description: string | null;
  frequency: RecurringFrequency;
  nextRunDate: string;
  endDate: string | null;
  lines: RecurringJournalLine[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GlParams {
  accountId?: number;
  from: string;
  to: string;
  clientId?: number;
  vendorId?: number;
  projectId?: number;
  departmentId?: number;
  page?: number;
  pageSize?: number;
}

export interface GlAccountsParams {
  from: string;
  to: string;
  type?: string;
}

export interface RecurringJournalParams {
  page?: number;
  pageSize?: number;
}

export interface CreateRecurringJournalInput {
  name: string;
  description?: string;
  frequency: RecurringFrequency;
  nextRunDate: string;
  endDate?: string;
  lines: RecurringJournalLine[];
}

export interface UpdateRecurringJournalInput {
  name?: string;
  description?: string;
  frequency?: RecurringFrequency;
  nextRunDate?: string;
  endDate?: string;
  lines?: RecurringJournalLine[];
  isActive?: boolean;
}

export interface PostOpeningBalancesInput {
  asOfDate: string;
  lines: Array<{ accountId: number; debit?: number; credit?: number }>;
}

export function useCoaTree() {
  return useQuery<{ items: AccountTreeNode[] }, Error>({
    queryKey: coreKeys.coaTree(),
    queryFn: () => apiClient.get<{ items: AccountTreeNode[] }>("/accounting/coa/tree"),
    staleTime: 60_000,
  });
}

export function useCoaTemplates() {
  return useQuery<{ items: CoaTemplate[] }, Error>({
    queryKey: coreKeys.coaTemplates(),
    queryFn: () => apiClient.get<{ items: CoaTemplate[] }>("/accounting/coa/templates"),
    staleTime: 300_000,
  });
}

export function useSetupStatus() {
  return useQuery<{ steps: SetupStep[] }, Error>({
    queryKey: coreKeys.setupStatus(),
    queryFn: () => apiClient.get<{ steps: SetupStep[] }>("/accounting/settings/setup-status"),
    staleTime: 60_000,
  });
}

export function useDeactivateAccount(accountId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; isActive: false }, Error, void>({
    mutationKey: [...coreKeys.all, "deactivate-account", accountId],
    mutationFn: () =>
      apiClient.post<{ id: number; isActive: false }>(`/accounting/coa/${accountId}/deactivate`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useActivateAccount(accountId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; isActive: true }, Error, void>({
    mutationKey: [...coreKeys.all, "activate-account", accountId],
    mutationFn: () =>
      apiClient.post<{ id: number; isActive: true }>(`/accounting/coa/${accountId}/activate`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useDeleteAccount(accountId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; isActive: boolean }, Error, void>({
    mutationKey: [...coreKeys.all, "delete-account", accountId],
    mutationFn: () =>
      apiClient.delete<{ id: number; isActive: boolean }>(`/accounting/coa/${accountId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();
  return useMutation<{ templateKey: string; inserted: number; skipped: number }, Error, { templateKey: string }>({
    mutationKey: [...coreKeys.all, "apply-template"],
    mutationFn: (body) =>
      apiClient.post<{ templateKey: string; inserted: number; skipped: number }>(
        "/accounting/coa/templates/apply",
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useGeneralLedger(params: GlParams) {
  return useQuery<GlResponse, Error>({
    queryKey: coreKeys.gl(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<GlResponse>("/accounting/general-ledger", toQuery(params)),
    enabled: !!params.from && !!params.to,
    staleTime: 30_000,
  });
}

export function useGlAccounts(params: GlAccountsParams) {
  return useQuery<{ items: GlAccount[] }, Error>({
    queryKey: coreKeys.glAccounts(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<{ items: GlAccount[] }>("/accounting/general-ledger/accounts", toQuery(params)),
    enabled: !!params.from && !!params.to,
    staleTime: 60_000,
  });
}

export function usePeriods() {
  return useQuery<AccountingPeriod[], Error>({
    queryKey: coreKeys.periods(),
    queryFn: () => apiClient.get<AccountingPeriod[]>("/accounting/periods"),
    staleTime: 60_000,
  });
}

export function useGeneratePeriods() {
  const queryClient = useQueryClient();
  return useMutation<{ created: number; total: number }, Error, { year: number }>({
    mutationKey: [...coreKeys.all, "generate-periods"],
    mutationFn: (body) =>
      apiClient.post<{ created: number; total: number }>("/accounting/periods", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function usePeriodChecklist(periodId: number, enabled: boolean) {
  return useQuery<PeriodChecklist, Error>({
    queryKey: coreKeys.periodChecklist(periodId),
    queryFn: () =>
      apiClient.get<PeriodChecklist>(`/accounting/periods/${periodId}/close-checklist`),
    enabled: enabled && Number.isInteger(periodId) && periodId > 0,
    staleTime: 30_000,
  });
}

export function useClosePeriod(periodId: number) {
  const queryClient = useQueryClient();
  return useMutation<AccountingPeriod, Error, void>({
    mutationKey: [...coreKeys.all, "close-period", periodId],
    mutationFn: () =>
      apiClient.post<AccountingPeriod>(`/accounting/periods/${periodId}/close`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useLockPeriod(periodId: number) {
  const queryClient = useQueryClient();
  return useMutation<AccountingPeriod, Error, void>({
    mutationKey: [...coreKeys.all, "lock-period", periodId],
    mutationFn: () =>
      apiClient.post<AccountingPeriod>(`/accounting/periods/${periodId}/lock`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useReopenPeriod(periodId: number) {
  const queryClient = useQueryClient();
  return useMutation<AccountingPeriod, Error, void>({
    mutationKey: [...coreKeys.all, "reopen-period", periodId],
    mutationFn: () =>
      apiClient.post<AccountingPeriod>(`/accounting/periods/${periodId}/reopen`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useOpeningBalance() {
  return useQuery<OpeningBalanceResponse, Error>({
    queryKey: coreKeys.openingBalance(),
    queryFn: () => apiClient.get<OpeningBalanceResponse>("/accounting/opening-balances"),
    staleTime: 60_000,
  });
}

export function usePostOpeningBalances() {
  const queryClient = useQueryClient();
  return useMutation<{ reimported: boolean }, Error, PostOpeningBalancesInput>({
    mutationKey: [...coreKeys.all, "post-opening-balances"],
    mutationFn: (body) =>
      apiClient.post<{ reimported: boolean }>("/accounting/opening-balances", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useSubmitJournalApproval(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, void>({
    mutationKey: [...coreKeys.all, "submit-approval", entryId],
    mutationFn: () =>
      apiClient.post<{ id: number; status: string }>(`/accounting/journal/${entryId}/submit-approval`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useApproveJournal(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, { note?: string }>({
    mutationKey: [...coreKeys.all, "approve-journal", entryId],
    mutationFn: (body) =>
      apiClient.post<{ id: number; status: string }>(`/accounting/journal/${entryId}/approve`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useRejectJournal(entryId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, { note?: string }>({
    mutationKey: [...coreKeys.all, "reject-journal", entryId],
    mutationFn: (body) =>
      apiClient.post<{ id: number; status: string }>(`/accounting/journal/${entryId}/reject`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useRecurringJournals(params: RecurringJournalParams = {}) {
  return useQuery<{ items: RecurringJournal[]; total: number }, Error>({
    queryKey: coreKeys.recurringJournals(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<{ items: RecurringJournal[]; total: number }>(
        "/accounting/recurring-journals",
        toQuery(params),
      ),
    staleTime: 60_000,
  });
}

export function useCreateRecurringJournal() {
  const queryClient = useQueryClient();
  return useMutation<RecurringJournal, Error, CreateRecurringJournalInput>({
    mutationKey: [...coreKeys.all, "create-recurring-journal"],
    mutationFn: (body) =>
      apiClient.post<RecurringJournal>("/accounting/recurring-journals", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useUpdateRecurringJournal(templateId: number) {
  const queryClient = useQueryClient();
  return useMutation<RecurringJournal, Error, UpdateRecurringJournalInput>({
    mutationKey: [...coreKeys.all, "update-recurring-journal", templateId],
    mutationFn: (body) =>
      apiClient.patch<RecurringJournal>(`/accounting/recurring-journals/${templateId}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useDeleteRecurringJournal(templateId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationKey: [...coreKeys.all, "delete-recurring-journal", templateId],
    mutationFn: () =>
      apiClient.delete<void>(`/accounting/recurring-journals/${templateId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useRunRecurringJournalNow(templateId: number) {
  const queryClient = useQueryClient();
  return useMutation<{ created: boolean; entryId?: number }, Error, void>({
    mutationKey: [...coreKeys.all, "run-recurring-now", templateId],
    mutationFn: () =>
      apiClient.post<{ created: boolean; entryId?: number }>(
        `/accounting/recurring-journals/${templateId}/run-now`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export * from "./dimensions";
