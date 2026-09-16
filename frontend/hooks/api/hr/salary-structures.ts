"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { SalaryTemplateList, SalaryTemplateRow } from "@/hooks/api/hr/salary-structures-schema";

export type { SalaryTemplateRow as SalaryStructureTemplate };

export type CreateSalaryTemplateInput = Omit<SalaryTemplateRow, "id" | "orgId" | "createdAt" | "updatedAt">;

const salaryListContract = lazyContract(() =>
  import("@/hooks/api/hr/salary-structures-schema").then((m) => m.salaryTemplateListContract),
);
const salaryRowContract = lazyContract(() =>
  import("@/hooks/api/hr/salary-structures-schema").then((m) => m.salaryTemplateRowContract),
);
const salaryDeleteContract = lazyContract(() =>
  import("@/hooks/api/hr/salary-structures-schema").then((m) => m.salaryDeleteContract),
);

export function useSalaryStructureTemplates(options?: { enabled?: boolean }) {
  const canView = useCan("hr:salary:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<SalaryTemplateList>({
    queryKey: humanResourcesQueryKeys.hr.salaryStructureTemplates(),
    queryFn: ({ signal }) => apiClient.get("/hr/payroll/salary-structures", undefined, signal, salaryListContract),
    staleTime: 120_000,
    enabled: canView && hrEnabled && (options?.enabled ?? true),
  });
}

export function useCreateSalaryTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:salary:manage", {
    mutationKey: ["hr", "salary-structure-templates", "create"],
    mutationFn: (data: CreateSalaryTemplateInput) =>
      apiClient.post("/hr/payroll/salary-structures", data, undefined, salaryRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.salaryStructureTemplates() }),
  });
}

export function useUpdateSalaryTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:salary:manage", {
    mutationKey: ["hr", "salary-structure-templates", "update"],
    mutationFn: ({ salaryStructureId, ...data }: Partial<CreateSalaryTemplateInput> & { salaryStructureId: number }) =>
      apiClient.patch(`/hr/payroll/salary-structures/${salaryStructureId}`, data, undefined, salaryRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.salaryStructureTemplates() }),
  });
}

export function useDeleteSalaryTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:salary:manage", {
    mutationKey: ["hr", "salary-structure-templates", "delete"],
    mutationFn: (salaryStructureId: number) => apiClient.delete(`/hr/payroll/salary-structures/${salaryStructureId}`, undefined, undefined, salaryDeleteContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.salaryStructureTemplates() }),
  });
}
