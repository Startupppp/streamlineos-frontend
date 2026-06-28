"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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

export interface ExpensePageFilters {
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

export interface ExpenseCategory {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  budgetLimit: string | null;
  budgetPeriod: string;
  isActive: boolean;
  createdAt: string;
  totalSpent: number;
  pendingAmount: number;
  approvedAmount: number;
  expenseCount: number;
}

export interface CreateExpenseCategoryInput {
  name: string;
  description?: string;
  budgetLimit?: number;
  budgetPeriod?: "MONTHLY" | "YEARLY";
}

export interface ExpenseReportData {
  summary: {
    totalExpenses: number;
    totalAmount: number;
    approvedAmount: number;
    rejectedAmount: number;
    pendingAmount: number;
    avgExpenseAmount: number;
  };
  byCategory: {
    category: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
  byEmployee: {
    userId: string;
    userName: string;
    count: number;
    amount: number;
  }[];
  byMonth: {
    month: string;
    count: number;
    amount: number;
  }[];
  byStatus: {
    status: string;
    count: number;
    amount: number;
  }[];
  topExpenses: {
    id: number;
    category: string;
    amount: number;
    description: string;
    userName: string;
    expenseDate: string;
  }[];
}

export function useExpensePageData(filters: ExpensePageFilters = {}) {
  const params: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "" && v !== null) params[k] = v;
  }
  return useQuery({
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
        "/hr/expenses/page-data",
        Object.keys(params).length ? params : undefined,
      ),
    staleTime: 30_000,
  });
}

export function useHrExpenses(
  userId?: string,
  status?: "PENDING" | "APPROVED" | "REJECTED" | "PAID",
) {
  const params: Record<string, unknown> = {};
  if (userId) params.userId = userId;
  if (status) params.status = status;

  return useQuery({
    queryKey: queryKeys.hr.expenses(
      Object.keys(params).length ? params : undefined,
    ),
    queryFn: () =>
      apiClient.get<{
        data: Expense[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>("/hr/expenses", Object.keys(params).length ? params : undefined),
    staleTime: 2 * 60_000,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseInput) =>
      apiClient.post<Expense>("/hr/expenses", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.expenses() }),
  });
}

export function useUpdateExpenseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, ...data }: UpdateExpenseStatusInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/expenses/${expenseId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.expenses() }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
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
      apiClient.patch<{ success: boolean }>(`/hr/expenses/${expenseId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.expenses() }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/expenses/${expenseId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.expenses() }),
  });
}

export function useHrExpenseCategories() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "expenseCategories"] as const,
    queryFn: () => apiClient.get<ExpenseCategory[]>("/hr/expenses/categories"),
    staleTime: 60_000,
  });
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseCategoryInput) =>
      apiClient.post<ExpenseCategory>("/hr/expenses/categories", data),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "expenseCategories"],
      }),
  });
}

export function useExpenseReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: [
      ...queryKeys.hr.all,
      "expenseReport",
      startDate,
      endDate,
    ] as const,
    queryFn: () =>
      apiClient.get<ExpenseReportData>("/hr/expenses/report", {
        startDate,
        endDate,
      }),
    staleTime: 60_000,
    enabled: !!startDate && !!endDate,
  });
}
