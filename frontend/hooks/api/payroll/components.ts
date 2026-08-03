"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
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
    queryKey: queryKeys.payroll.components(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<PaginatedResult<SalaryComponent>>(
        "/payroll/components",
        params as Record<string, unknown> | undefined,
      ),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useCreatePayrollComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "components", "create"],
    mutationFn: (data: CreateComponentInput) =>
      apiClient.post<SalaryComponent>("/payroll/components", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.payroll.components() }),
  });
}

export function useUpdatePayrollComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "components", "update"],
    mutationFn: ({ id, data }: UpdateComponentInput) =>
      apiClient.patch<SalaryComponent>(`/payroll/components/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.payroll.components() }),
  });
}

export function useDeletePayrollComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "components", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean; softDeleted: boolean }>(
        `/payroll/components/${id}`,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.payroll.components() }),
  });
}
