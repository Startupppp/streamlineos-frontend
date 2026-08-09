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
    queryKey: [...queryKeys.hr.expenses(), "pageData", params] as const,
    queryFn: () =>
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
  return useMutation({
    mutationKey: ["hr", "expenses", "create"],
    mutationFn: (data: CreateExpenseInput) =>
      apiClient.post<Expense>("/me/expenses", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.expenses() }),
  });
}

export function useUpdateExpenseStatus() {
  const qc = useQueryClient();
  return useMutation({
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


