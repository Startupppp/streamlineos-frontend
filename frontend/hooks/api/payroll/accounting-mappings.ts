"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  AccountingMapping,
  CreateAccountingMappingInput,
  UpdateAccountingMappingInput,
} from "@/types/payroll/reports";

const accountingMappingListC = lazyContract(() =>
  import("@/hooks/api/payroll/accounting-schema").then((m) => m.accountingMappingListContract),
);
const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const accountingMappingC = lazyContract(() =>
  import("@/hooks/api/payroll/accounting-schema").then((m) => m.accountingMappingContract),
);

export function useAccountingMappings() {
  const canManage = useCan("payroll:settings:manage");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.accountingMappings(),
    queryFn: ({ signal }) => apiClient.get<AccountingMapping[]>("/payroll/accounting-mappings", undefined, signal, accountingMappingListC),
    staleTime: 5 * 60_000,
    enabled: canManage,
  });
}

export function useCreateAccountingMapping() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:settings:manage", {
    mutationKey: ["payroll", "accounting-mappings", "create"],
    mutationFn: (data: CreateAccountingMappingInput) =>
      apiClient.post<AccountingMapping>("/payroll/accounting-mappings", data, undefined, accountingMappingC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.accountingMappings() });
    },
  });
}

export function useUpdateAccountingMapping() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:settings:manage", {
    mutationKey: ["payroll", "accounting-mappings", "update"],
    mutationFn: ({ id, ...data }: { id: number } & UpdateAccountingMappingInput) =>
      apiClient.patch<AccountingMapping>(`/payroll/accounting-mappings/${id}`, data, undefined, accountingMappingC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.accountingMappings() });
    },
  });
}

export function useDeleteAccountingMapping() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:settings:manage", {
    mutationKey: ["payroll", "accounting-mappings", "delete"],
    mutationFn: ({ id }: { id: number }) =>
      apiClient.delete<void>(`/payroll/accounting-mappings/${id}`, undefined, undefined, noContentC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.accountingMappings() });
    },
  });
}
