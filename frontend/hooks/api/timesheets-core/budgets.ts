"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { CreateBudgetInput, TimesheetBudget } from "@/features/timesheets/types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export function useBudgets(enabled = true) {
  const canView = useCan("timesheets:budgets:view");
  return useQuery({
    queryKey: queryKeys.timesheets.budgets(),
    queryFn: ({ signal }) => apiClient.get<TimesheetBudget[]>("/timesheets/budgets", undefined, signal),
    staleTime: 60_000,
    enabled: enabled && canView,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:budgets:manage", {
    mutationKey: ["timesheets", "budgets", "create"],
    mutationFn: (data: CreateBudgetInput) =>
      apiClient.post<TimesheetBudget>("/timesheets/budgets", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.budgets() });
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
      apiClient.patch<TimesheetBudget>(`/timesheets/budgets/${budgetId}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.budgets() });
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
      apiClient.delete<{ success: boolean }>(`/timesheets/budgets/${budgetId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.budgets() });
      toast.success("Budget removed");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
