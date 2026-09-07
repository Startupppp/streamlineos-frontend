"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

const departmentListLazy = lazyContract(() =>
  import("@/hooks/api/hr/employee-departments-schema").then((m) => m.departmentListContract),
);
const departmentItemLazy = lazyContract(() =>
  import("@/hooks/api/hr/employee-departments-schema").then((m) => m.departmentItemContract),
);
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import type { Department, CreateDepartmentInput } from "@/types/hr";

export function useHrDepartments(options?: { enabled?: boolean }) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.departments(),
    queryFn: ({ signal }) =>
      apiClient.get<Department[]>("/hr/departments", undefined, signal, departmentListLazy),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView && (options?.enabled ?? true),
  });
}

export interface LegacyDepartment {
  id: number;
  name: string;
}

export function useLegacyHrDepartments() {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.legacyDepartments(),
    queryFn: ({ signal }) =>
      apiClient.get<LegacyDepartment[]>(
        "/hr/departments/legacy",
        undefined,
        signal,
      ),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "departments", "create"],
    mutationFn: (data: CreateDepartmentInput) =>
      apiClient.post<Department>("/hr/departments", data, undefined, departmentItemLazy),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: humanResourcesQueryKeys.hr.departments(),
      });
      void qc.invalidateQueries({
        queryKey: humanResourcesQueryKeys.hr.onboardingTemplateDepartments(),
      });
    },
  });
}
