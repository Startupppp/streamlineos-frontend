"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { CreateBudgetInput, TimesheetBudget } from "@/features/timesheets/types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const budgetListC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-schema").then((m) => m.budgetListResponseContract),
);
const budgetItemC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-schema").then((m) => m.budgetItemContract),
);

export function useBudgets(enabled = true) {
  const canView = useCan("timesheets:budgets:view");
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.budgets(),
    queryFn: ({ signal }) => apiClient.get<TimesheetBudget[]>("/timesheets/budgets", undefined, signal, budgetListC),
    staleTime: 60_000,
    enabled: enabled && canView,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:budgets:manage", {
    mutationKey: ["timesheets", "budgets", "create"],
    mutationFn: (data: CreateBudgetInput) =>
      apiClient.post<TimesheetBudget>("/timesheets/budgets", data, undefined, budgetItemC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.budgets() });
      toast.success("Budget added");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:budgets:manage", {
    mutationKey: ["timesheets", "budgets", "update"],
    mutationFn: ({ budgetId, data }: { budgetId: number; data: Partial<CreateBudgetInput> }) =>
      apiClient.patch<TimesheetBudget>(`/timesheets/budgets/${budgetId}`, data, undefined, budgetItemC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.budgets() });
      toast.success("Budget updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:budgets:manage", {
    mutationKey: ["timesheets", "budgets", "delete"],
    mutationFn: (budgetId: number) =>
      apiClient.delete<{ success: boolean }>(`/timesheets/budgets/${budgetId}`, undefined, undefined, undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.budgets() });
      toast.success("Budget removed");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
