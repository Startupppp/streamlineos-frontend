"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import type {
  Expense,
  CreateExpenseInput,
  UpdateExpenseStatusInput,
} from "@/types/hr";
import type {
  ExpenseWithRelations,
  ExpenseCategoryRecord,
  ExpenseStats,
} from "@/types/hr/expenses";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface ExpensePageFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  startDate?: string;
  endDate?: string;
  month?: string;
  status?: string;
  category?: string;
  categoryId?: number;
  search?: string;
  userId?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
}

export function useExpensePageData(
  filters: ExpensePageFilters = {},
  options?: { enabled?: boolean; selfService?: boolean },
) {
  const canExpenses = useCan("hr:expenses:view");
  const accountingEnabled = useModuleEnabled("accounting");
  const params: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "" && v !== null) params[k] = v;
  }
  return useQuery({
    enabled: (options?.selfService === true || (canExpenses && accountingEnabled)) && (options?.enabled ?? true),
    // The scope segment is load-bearing: `selfService` selects between a
    // one-person endpoint and an org-wide one, and without it in the key the
    // approver's first render (permissions still in flight -> selfService true)
    // parks `/me/expenses` under the key the org read then reuses.
    // It sits INSIDE the `hr.expenses()` prefix so both entries still answer to
    // the invalidation every expense mutation issues.
    queryKey: [
      ...queryKeys.hr.expenses(),
      "pageData",
      options?.selfService ? "self" : "org",
      params,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<{
        expenses: ExpenseWithRelations[];
        pendingExpenses: ExpenseWithRelations[];
        stats: ExpenseStats | null;
        categories: ExpenseCategoryRecord[];
        pagination: {
          page: number;
          pageSize: number;
          total: number;
          totalPages: number;
        };
        isAdmin: boolean;
      }>(
        options?.selfService ? "/me/expenses" : "/hr/expenses/page-data",
        Object.keys(params).length ? params : undefined,
      ),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useAuthorizedMutation("self:expenses", {
    mutationKey: ["hr", "expenses", "create"],
    mutationFn: (data: CreateExpenseInput) =>
      apiClient.post<Expense>("/me/expenses", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.expenses() }),
  });
}

export function useUpdateExpenseStatus() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:expenses:approve", {
    mutationKey: ["hr", "expenses", "update-status"],
    mutationFn: ({ expenseId, ...data }: UpdateExpenseStatusInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/expenses/${expenseId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.expenses() }),
  });
}

export function useUpdateExpense(options?: { selfService?: boolean }) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "expenses", "update"],
    mutationFn: ({
      expenseId,
      ...data
    }: {
      expenseId: number;
      category?: string;
      amount?: number;
      description?: string;
      merchant?: string;
      paymentMethod?: string;
      expenseDate?: string;
      receiptUrl?: string;
      receiptFileName?: string;
    }) =>
      apiClient.patch<{ success: boolean }>(
        `${options?.selfService ? "/me/expenses" : "/hr/expenses"}/${expenseId}`,
        data,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.expenses() }),
  });
}

export type ExpenseExportJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "expired";

export interface ExpenseExportJob {
  id: string;
  status: ExpenseExportJobStatus;
  processedRows: number;
  rowCount: number | null;
  truncated: boolean | null;
  fileName: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface CreateExpenseExportJobInput {
  status?: string;
  startDate?: string;
  endDate?: string;
}

export function useCreateExpenseExportJob() {
  return useAuthorizedMutation<
    ExpenseExportJob,
    Error,
    { input: CreateExpenseExportJobInput; idempotencyKey: string }
  >("hr:expenses:read", {
    mutationKey: ["hr", "expenses", "export", "jobs", "create"],
    mutationFn: ({ input, idempotencyKey }) =>
      apiClient.post<ExpenseExportJob>("/hr/expenses/export/jobs", input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
  });
}

export function useExpenseExportJob(jobId: string | null) {
  const canRead = useCan("hr:expenses:read");
  return useQuery<ExpenseExportJob, Error>({
    queryKey: queryKeys.hr.expenseExportJob(jobId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<ExpenseExportJob>(`/hr/expenses/export/jobs/${jobId}`, undefined, signal),
    enabled: canRead && !!jobId,
    staleTime: 1_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "running" ? 3_000 : false;
    },
  });
}

export function useDownloadExpenseExportJob() {
  const canRead = useCan("hr:expenses:read");
  return useAuthorizedMutation<Blob, Error, string>("hr:expenses:read", {
    mutationKey: ["hr", "expenses", "export", "jobs", "download"],
    mutationFn: (jobId) => {
      if (!canRead)
        return Promise.reject(new Error("Expense read access is required"));
      return apiClient.download(`/hr/expenses/export/jobs/${jobId}/download`);
    },
  });
}
