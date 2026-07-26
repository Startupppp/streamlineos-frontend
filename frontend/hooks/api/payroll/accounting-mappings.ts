"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  AccountingMapping,
  CreateAccountingMappingInput,
  UpdateAccountingMappingInput,
} from "@/types/payroll/reports";

export function useAccountingMappings() {
  const canManage = useCan("payroll:settings:manage");
  return useQuery({
    queryKey: queryKeys.payroll.accountingMappings(),
    queryFn: () => apiClient.get<AccountingMapping[]>("/payroll/accounting-mappings"),
    staleTime: 5 * 60_000,
    enabled: canManage,
  });
}

export function useCreateAccountingMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "accounting-mappings", "create"],
    mutationFn: (data: CreateAccountingMappingInput) =>
      apiClient.post<AccountingMapping>("/payroll/accounting-mappings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.accountingMappings() });
    },
  });
}

export function useUpdateAccountingMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "accounting-mappings", "update"],
    mutationFn: ({ id, ...data }: { id: number } & UpdateAccountingMappingInput) =>
      apiClient.patch<AccountingMapping>(`/payroll/accounting-mappings/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.accountingMappings() });
    },
  });
}

export function useDeleteAccountingMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "accounting-mappings", "delete"],
    mutationFn: ({ id }: { id: number }) =>
      apiClient.delete<void>(`/payroll/accounting-mappings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.accountingMappings() });
    },
  });
}
