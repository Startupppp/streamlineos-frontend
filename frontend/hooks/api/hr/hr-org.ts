"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import type {
  HrJobRole,
  HrJobLevel,
  OrgCatalogInput,
} from "@/types/hr/core";

export function useOrgJobRoles(options?: { enabled?: boolean }) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.orgRoles(),
    queryFn: ({ signal }) => apiClient.get<HrJobRole[]>("/hr/org/roles", undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-org-schema").then(m => m.jobRoleListContract))),
    staleTime: 5 * 60_000,
    enabled: hrEnabled && canView && (options?.enabled ?? true),
  });
}

export function useCreateJobRole() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "org", "role", "create"],
    mutationFn: (data: OrgCatalogInput) => apiClient.post<HrJobRole>("/hr/org/roles", data, undefined, lazyContract(() => import("@/hooks/api/hr/hr-org-schema").then(m => m.jobRoleRowContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.orgRoles() }),
  });
}

export function useUpdateJobRole() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "org", "role", "update"],
    mutationFn: ({ jobRoleId, ...jobRole }: OrgCatalogInput & { jobRoleId: number }) =>
      apiClient.patch<HrJobRole>(`/hr/org/roles/${jobRoleId}`, jobRole, undefined, lazyContract(() => import("@/hooks/api/hr/hr-org-schema").then(m => m.jobRoleRowContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.orgRoles() }),
  });
}

export function useDeleteJobRole() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "org", "role", "delete"],
    mutationFn: (jobRoleId: number) =>
      apiClient.delete<void>(`/hr/org/roles/${jobRoleId}`, undefined, undefined, noContentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.orgRoles() }),
  });
}

export function useOrgJobLevels(options?: { enabled?: boolean }) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.orgLevels(),
    queryFn: ({ signal }) => apiClient.get<HrJobLevel[]>("/hr/org/levels", undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-org-schema").then(m => m.jobLevelListContract))),
    staleTime: 5 * 60_000,
    enabled: hrEnabled && canView && (options?.enabled ?? true),
  });
}

export function useCreateJobLevel() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "org", "level", "create"],
    mutationFn: (data: OrgCatalogInput) => apiClient.post<HrJobLevel>("/hr/org/levels", data, undefined, lazyContract(() => import("@/hooks/api/hr/hr-org-schema").then(m => m.jobLevelRowContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.orgLevels() }),
  });
}

export function useUpdateJobLevel() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "org", "level", "update"],
    mutationFn: ({ jobLevelId, ...jobLevel }: OrgCatalogInput & { jobLevelId: number }) =>
      apiClient.patch<HrJobLevel>(`/hr/org/levels/${jobLevelId}`, jobLevel, undefined, lazyContract(() => import("@/hooks/api/hr/hr-org-schema").then(m => m.jobLevelRowContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.orgLevels() }),
  });
}

export function useDeleteJobLevel() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "org", "level", "delete"],
    mutationFn: (jobLevelId: number) =>
      apiClient.delete<void>(`/hr/org/levels/${jobLevelId}`, undefined, undefined, noContentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.orgLevels() }),
  });
}
