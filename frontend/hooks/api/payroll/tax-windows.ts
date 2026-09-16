"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  TaxWindow,
  CreateTaxWindowInput,
  UpdateTaxWindowInput,
} from "@/types/payroll/reports";

const taxWindowListC = lazyContract(() =>
  import("@/hooks/api/payroll/tax-schema").then((m) => m.taxWindowListContract),
);
const taxWindowC = lazyContract(() =>
  import("@/hooks/api/payroll/tax-schema").then((m) => m.taxWindowContract),
);

export function useTaxWindows() {
  const canManage = useCan("payroll:tax:manage");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.taxWindows(),
    queryFn: ({ signal }) => apiClient.get<TaxWindow[]>("/payroll/tax-windows", undefined, signal, taxWindowListC),
    staleTime: 5 * 60_000,
    enabled: canManage,
  });
}

export function useCreateTaxWindow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:tax:manage", {
    mutationKey: ["payroll", "tax-windows", "create"],
    mutationFn: (data: CreateTaxWindowInput) =>
      apiClient.post<TaxWindow>("/payroll/tax-windows", data, undefined, taxWindowC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.taxWindows() });
    },
  });
}

export function useUpdateTaxWindow() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:tax:manage", {
    mutationKey: ["payroll", "tax-windows", "update"],
    mutationFn: ({ taxWindowId, ...data }: { taxWindowId: number } & UpdateTaxWindowInput) =>
      apiClient.patch<TaxWindow>(`/payroll/tax-windows/${taxWindowId}`, data, undefined, taxWindowC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.taxWindows() });
    },
  });
}
