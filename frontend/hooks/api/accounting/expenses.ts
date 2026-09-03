"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  bankAccountsPageContract,
  type BankAccountRecord,
} from "@/hooks/api/accounting/banking-schema";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  FinReceiptInboxItem,
  FinReimbursementBatch,
  FinReimbursementBatchDetail,
  FinExpensePolicy,
  ListResponse,
  CreateBatchInput,
  PayBatchInput,
  PatchReceiptInput,
  CreatePolicyInput,
  UpdatePolicyInput,
} from "@/types/accounting/expenses";
import type { ExpenseWithRelations, ExpenseStats, ExpenseCategoryRecord } from "@/types/hr/expenses";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const expenseKeys = {
  all: [...queryKeys.accounting.all, "expenses"] as const,
  team: (params?: object) => [...queryKeys.accounting.all, "expenses", "team", params] as const,
  receipts: (params?: object) => [...queryKeys.accounting.all, "expenses", "receipts", params] as const,
  batches: (params?: object) => [...queryKeys.accounting.all, "expenses", "batches", params] as const,
  batch: (id: number) => [...queryKeys.accounting.all, "expenses", "batches", id] as const,
  policies: () => [...queryKeys.accounting.all, "expenses", "policies"] as const,
  bankAccounts: () => [...queryKeys.accounting.all, "expenses", "bankAccounts"] as const,
  pendingForBatch: () => [...queryKeys.accounting.all, "expenses", "pendingForBatch"] as const,
} as const;

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export interface TeamExpensesParams {
  page?: number;
  pageSize?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface TeamExpensesResponse {
  expenses: ExpenseWithRelations[];
  stats: ExpenseStats | null;
  categories: ExpenseCategoryRecord[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  isAdmin: boolean;
}

export function useTeamExpenses(params: TeamExpensesParams = {}) {
  const can = useCan("accounting:reimbursements:read");
  return useQuery<TeamExpensesResponse, Error>({
    queryKey: expenseKeys.team(params),
    queryFn: ({ signal }) =>
      apiClient.get<TeamExpensesResponse>("/hr/expenses/page-data", toQuery({ ...params, includeStats: true, includePending: false, includeCategories: true }), signal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: can,
  });
}

export interface ReceiptInboxParams {
  page?: number;
  pageSize?: number;
}

export function useReceiptInbox(params: ReceiptInboxParams = {}) {
  const can = useCan("accounting:reimbursements:read");
  return useQuery<ListResponse<FinReceiptInboxItem>, Error>({
    queryKey: expenseKeys.receipts(params),
    queryFn: ({ signal }) =>
      apiClient.get<ListResponse<FinReceiptInboxItem>>("/accounting/expenses/receipts", toQuery(params), signal),
    staleTime: 30_000,
    enabled: can,
  });
}

export function usePatchReceiptMetadata(expenseId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, PatchReceiptInput>("accounting:reimbursements:manage", {
    mutationKey: ["accounting", "expenses", "receipts", "patch", expenseId],
    mutationFn: (data) =>
      apiClient.patch<{ success: boolean }>(`/accounting/expenses/receipts/${expenseId}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.accounting.all, "expenses", "receipts"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.accounting.all, "expenses", "team"] });
    },
  });
}

export interface BatchListParams {
  page?: number;
  pageSize?: number;
  status?: "DRAFT" | "APPROVED" | "PAID";
}

export function useReimbursementBatches(params: BatchListParams = {}) {
  const can = useCan("accounting:reimbursements:read");
  return useQuery<ListResponse<FinReimbursementBatch>, Error>({
    queryKey: expenseKeys.batches(params),
    queryFn: ({ signal }) =>
      apiClient.get<ListResponse<FinReimbursementBatch>>("/accounting/reimbursements", toQuery(params), signal),
    staleTime: 30_000,
    enabled: can,
  });
}

export function useReimbursementBatch(batchId: number) {
  const can = useCan("accounting:reimbursements:read");
  return useQuery<FinReimbursementBatchDetail, Error>({
    queryKey: expenseKeys.batch(batchId),
    queryFn: ({ signal }) =>
      apiClient.get<FinReimbursementBatchDetail>(`/accounting/reimbursements/${batchId}`, undefined, signal),
    staleTime: 30_000,
    enabled: can && Number.isInteger(batchId) && batchId > 0,
  });
}

export function useCreateReimbursementBatch() {
  const qc = useQueryClient();
  return useAuthorizedMutation<FinReimbursementBatch, Error, CreateBatchInput>("accounting:reimbursements:manage", {
    mutationKey: ["accounting", "expenses", "batches", "create"],
    mutationFn: (data) =>
      apiClient.post<FinReimbursementBatch>("/accounting/reimbursements", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.accounting.all, "expenses", "batches"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.accounting.all, "expenses", "pendingForBatch"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.accounting.all, "expenses", "team"] });
    },
  });
}

export function useApproveBatch(batchId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, void>("accounting:reimbursements:approve", {
    mutationKey: ["accounting", "expenses", "batches", "approve", batchId],
    mutationFn: () =>
      apiClient.post<{ success: boolean }>(`/accounting/reimbursements/${batchId}/approve`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: expenseKeys.batch(batchId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.accounting.all, "expenses", "batches"] });
    },
  });
}

export function usePayBatch(batchId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ success: boolean; entryId?: number }, Error, PayBatchInput>("accounting:reimbursements:manage", {
    mutationKey: ["accounting", "expenses", "batches", "pay", batchId],
    mutationFn: (data) =>
      apiClient.post<{ success: boolean; entryId?: number }>(`/accounting/reimbursements/${batchId}/pay`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: expenseKeys.batch(batchId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.accounting.all, "expenses", "batches"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.accounting.all, "expenses", "team"] });
    },
  });
}

export function usePendingForBatch() {
  const can = useCan("accounting:reimbursements:manage");
  return useQuery<{ expenses: ExpenseWithRelations[]; pagination: { total: number } }, Error>({
    queryKey: expenseKeys.pendingForBatch(),
    queryFn: ({ signal }) =>
      apiClient.get<{ expenses: ExpenseWithRelations[]; pagination: { total: number } }>("/hr/expenses/page-data", {
        status: "REIMBURSEMENT_PENDING",
        pageSize: "200",
        includeStats: "false",
        includePending: "false",
        includeCategories: "false",
      }, signal),
    staleTime: 30_000,
    enabled: can,
  });
}

export function useExpensePolicies() {
  const can = useCan("accounting:reimbursements:read");
  return useQuery<FinExpensePolicy[], Error>({
    queryKey: expenseKeys.policies(),
    queryFn: ({ signal }) => apiClient.get<FinExpensePolicy[]>("/accounting/expenses/policies", undefined, signal),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCreateExpensePolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation<FinExpensePolicy, Error, CreatePolicyInput>("accounting:reimbursements:manage", {
    mutationKey: ["accounting", "expenses", "policies", "create"],
    mutationFn: (data) => apiClient.post<FinExpensePolicy>("/accounting/expenses/policies", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: expenseKeys.policies() });
    },
  });
}

export function useUpdateExpensePolicy(policyId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, UpdatePolicyInput>("accounting:reimbursements:manage", {
    mutationKey: ["accounting", "expenses", "policies", "update", policyId],
    mutationFn: (data) =>
      apiClient.patch<{ success: boolean }>(`/accounting/expenses/policies/${policyId}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: expenseKeys.policies() });
    },
  });
}

export function useDeleteExpensePolicy(policyId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, void>("accounting:reimbursements:manage", {
    mutationKey: ["accounting", "expenses", "policies", "delete", policyId],
    mutationFn: () =>
      apiClient.delete<{ success: boolean }>(`/accounting/expenses/policies/${policyId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: expenseKeys.policies() });
    },
  });
}

/**
 * `/finance/bank-accounts` is a keyset PAGE, not a bare array. Typing it as an
 * array meant `data` was the envelope object, `data.filter` was not a function
 * and the account picker in the pay-batch dialog listed nothing. The page is
 * unwrapped here so the hook keeps returning a list, which is what its one
 * caller reads. `FinBankAccount` also named the masked account column
 * `accountNumber`; the server sends `accountNumberMasked`.
 */
export function useFinBankAccounts() {
  const can = useCan("accounting:banking:read");
  return useQuery<BankAccountRecord[], Error>({
    queryKey: expenseKeys.bankAccounts(),
    queryFn: async ({ signal }) => {
      const page = await apiClient.get(
        "/finance/bank-accounts",
        undefined,
        signal,
        bankAccountsPageContract,
      );
      return page.data;
    },
    staleTime: 120_000,
    enabled: can,
  });
}

export function useApproveExpense(expenseId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, void>("hr:expenses:approve", {
    mutationKey: ["hr", "expenses", "approve", expenseId],
    mutationFn: () =>
      apiClient.post<{ success: boolean }>(`/hr/expenses/${expenseId}/approve`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.accounting.all, "expenses", "team"] });
    },
  });
}

export function useRejectExpense(expenseId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, { rejectionReason: string }>("hr:expenses:approve", {
    mutationKey: ["hr", "expenses", "reject", expenseId],
    mutationFn: (data) =>
      apiClient.post<{ success: boolean }>(`/hr/expenses/${expenseId}/reject`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.accounting.all, "expenses", "team"] });
    },
  });
}
