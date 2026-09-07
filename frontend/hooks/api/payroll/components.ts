"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const componentListC = lazyContract(() =>
  import("@/hooks/api/payroll/components-schema").then((m) => m.componentListResponseContract),
);
const salaryComponentC = lazyContract(() =>
  import("@/hooks/api/payroll/components-schema").then((m) => m.salaryComponentContract),
);
const deleteComponentC = lazyContract(() =>
  import("@/hooks/api/payroll/components-schema").then((m) => m.deleteComponentResponseContract),
);
import type {
  SalaryComponent,
  ComponentType,
  CalcMethod,
  PaginatedResult,
} from "@/types/payroll/setup";

type ComponentListParams = {
  type?: ComponentType;
  active?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
};

type CreateComponentInput = {
  code: string;
  name: string;
  type: ComponentType;
  calcMethod: CalcMethod;
  amount?: string;
  percent?: string;
  formula?: string;
  taxable: boolean;
  showOnPayslip: boolean;
  includeInCtc: boolean;
  sortOrder?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
};

type UpdateComponentInput = {
  id: number;
  data: Partial<CreateComponentInput>;
};

export function usePayrollComponents(params?: ComponentListParams) {
  const canView = useCan("payroll:components:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.components(params as Record<string, unknown> | undefined),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/payroll/components",
        params as Record<string, unknown> | undefined, signal, componentListC,
      ),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useCreatePayrollComponent() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:components:manage", {
    mutationKey: ["payroll", "components", "create"],
    mutationFn: (data: CreateComponentInput) =>
      apiClient.post<SalaryComponent>("/payroll/components", data, undefined, salaryComponentC),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.components() }),
  });
}

export function useUpdatePayrollComponent() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:components:manage", {
    mutationKey: ["payroll", "components", "update"],
    mutationFn: ({ id, data }: UpdateComponentInput) =>
      apiClient.patch<SalaryComponent>(`/payroll/components/${id}`, data, undefined, salaryComponentC),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.components() }),
  });
}

export function useDeletePayrollComponent() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:components:manage", {
    mutationKey: ["payroll", "components", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean; softDeleted: boolean }>(
        `/payroll/components/${id}`, undefined, undefined, deleteComponentC,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.components() }),
  });
}
