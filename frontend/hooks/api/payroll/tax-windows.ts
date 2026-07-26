"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import type {
  TaxWindow,
  CreateTaxWindowInput,
  UpdateTaxWindowInput,
} from "@/types/payroll/reports";

export const taxWindowKeys = {
  all: ["payroll", "tax-windows"] as const,
};

export function useTaxWindows() {
  const canManage = useCan("payroll:tax:manage");
  return useQuery({
    queryKey: taxWindowKeys.all,
    queryFn: () => apiClient.get<TaxWindow[]>("/payroll/tax-windows"),
    staleTime: 5 * 60_000,
    enabled: canManage,
  });
}

export function useCreateTaxWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "tax-windows", "create"],
    mutationFn: (data: CreateTaxWindowInput) =>
      apiClient.post<TaxWindow>("/payroll/tax-windows", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taxWindowKeys.all });
    },
  });
}

export function useUpdateTaxWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "tax-windows", "update"],
    mutationFn: ({ id, ...data }: { id: number } & UpdateTaxWindowInput) =>
      apiClient.patch<TaxWindow>(`/payroll/tax-windows/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taxWindowKeys.all });
    },
  });
}
