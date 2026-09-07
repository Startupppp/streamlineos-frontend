"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
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

const _expensePageDataContract = lazyContract(() =>
  import("@/hooks/api/hr/expenses-schema").then((m) => m.expensePageDataContract),
);
const _expenseRowContract = lazyContract(() =>
  import("@/hooks/api/hr/expenses-schema").then((m) => m.expenseRowContract),
);
const _successContract = lazyContract(() =>
  import("@/hooks/api/hr/expenses-schema").then((m) => m.successContract),
);
const _expenseExportJobContract = lazyContract(() =>
  import("@/hooks/api/hr/expenses-schema").then((m) => m.expenseExportJobContract),
);

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
      ...humanResourcesQueryKeys.hr.expenses(),
      "pageData",
      options?.selfService ? "self" : "org",
      params,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get(
        options?.selfService ? "/me/expenses" : "/hr/expenses/page-data",
        Object.keys(params).length ? params : undefined,
        signal,
        _expensePageDataContract,
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
      apiClient.post("/me/expenses", data, undefined, _expenseRowContract),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.expenses() }),
  });
}

export function useUpdateExpenseStatus() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:expenses:approve", {
    mutationKey: ["hr", "expenses", "update-status"],
    mutationFn: ({ expenseId, ...data }: UpdateExpenseStatusInput) =>
      apiClient.patch(`/hr/expenses/${expenseId}`, data, undefined, _successContract),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.expenses() }),
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
      apiClient.patch(
        `${options?.selfService ? "/me/expenses" : "/hr/expenses"}/${expenseId}`,
        data,
        undefined,
        _successContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.expenses() }),
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
      apiClient.post("/hr/expenses/export/jobs", input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }, _expenseExportJobContract),
  });
}

export function useExpenseExportJob(jobId: string | null) {
  const canRead = useCan("hr:expenses:read");
  return useQuery<ExpenseExportJob, Error>({
    queryKey: humanResourcesQueryKeys.hr.expenseExportJob(jobId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get(`/hr/expenses/export/jobs/${jobId}`, undefined, signal, _expenseExportJobContract),
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
