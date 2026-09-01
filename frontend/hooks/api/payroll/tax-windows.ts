"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  TaxWindow,
  CreateTaxWindowInput,
  UpdateTaxWindowInput,
} from "@/types/payroll/reports";

export function useTaxWindows() {
  const canManage = useCan("payroll:tax:manage");
  return useQuery({
    queryKey: queryKeys.payroll.taxWindows(),
    queryFn: ({ signal }) => apiClient.get<TaxWindow[]>("/payroll/tax-windows", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canManage,
  });
}

export function useCreateTaxWindow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:tax:manage", {
    mutationKey: ["payroll", "tax-windows", "create"],
    mutationFn: (data: CreateTaxWindowInput) =>
      apiClient.post<TaxWindow>("/payroll/tax-windows", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.taxWindows() });
    },
  });
}

export function useUpdateTaxWindow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:tax:manage", {
    mutationKey: ["payroll", "tax-windows", "update"],
    mutationFn: ({ id, ...data }: { id: number } & UpdateTaxWindowInput) =>
      apiClient.patch<TaxWindow>(`/payroll/tax-windows/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.taxWindows() });
    },
  });
}
