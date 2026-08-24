import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface SalaryStructureTemplate {
  id: number;
  orgId: string;
  name: string;
  basicSalary: string;
  hraPercent: string;
  specialAllowance: string | null;
  medicalAllowance: string | null;
  travelAllowance: string | null;
  otherAllowances: string | null;
  pfDeductionPercent: string | null;
  professionalTax: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
}

export type CreateSalaryTemplateInput = Omit<SalaryStructureTemplate, "id" | "orgId" | "createdAt">;

export function useSalaryStructureTemplates(options?: { enabled?: boolean }) {
  return useQuery<SalaryStructureTemplate[]>({
    queryKey: queryKeys.hr.salaryStructureTemplates(),
    queryFn: () => apiClient.get<SalaryStructureTemplate[]>("/hr/payroll/salary-structures"),
    staleTime: 120_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateSalaryTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "salary-structure-templates", "create"],
    mutationFn: (data: CreateSalaryTemplateInput) =>
      apiClient.post<SalaryStructureTemplate>("/hr/payroll/salary-structures", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.salaryStructureTemplates() }),
  });
}

export function useUpdateSalaryTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "salary-structure-templates", "update"],
    mutationFn: ({ id, ...data }: Partial<CreateSalaryTemplateInput> & { id: number }) =>
      apiClient.patch<SalaryStructureTemplate>(`/hr/payroll/salary-structures/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.salaryStructureTemplates() }),
  });
}

export function useDeleteSalaryTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "salary-structure-templates", "delete"],
    mutationFn: (id: number) => apiClient.delete<void>(`/hr/payroll/salary-structures/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.salaryStructureTemplates() }),
  });
}
