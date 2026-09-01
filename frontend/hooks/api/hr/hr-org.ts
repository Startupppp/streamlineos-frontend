"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import type {
  HrJobRole,
  HrJobLevel,
  HrHeadcountGroup,
  OrgCatalogInput,
} from "@/types/hr/core";

export function useOrgJobRoles(options?: { enabled?: boolean }) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.orgRoles(),
    queryFn: ({ signal }) => apiClient.get<HrJobRole[]>("/hr/org/roles", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: hrEnabled && canView && (options?.enabled ?? true),
  });
}

export function useCreateJobRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "role", "create"],
    mutationFn: (data: OrgCatalogInput) => apiClient.post<HrJobRole>("/hr/org/roles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgRoles() }),
  });
}

export function useUpdateJobRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "role", "update"],
    mutationFn: ({ jobRoleId, ...jobRole }: OrgCatalogInput & { jobRoleId: number }) =>
      apiClient.patch<HrJobRole>(`/hr/org/roles/${jobRoleId}`, jobRole),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgRoles() }),
  });
}

export function useDeleteJobRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "role", "delete"],
    mutationFn: (jobRoleId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/org/roles/${jobRoleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgRoles() }),
  });
}

export function useOrgJobLevels(options?: { enabled?: boolean }) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.orgLevels(),
    queryFn: ({ signal }) => apiClient.get<HrJobLevel[]>("/hr/org/levels", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: hrEnabled && canView && (options?.enabled ?? true),
  });
}

export function useCreateJobLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "level", "create"],
    mutationFn: (data: OrgCatalogInput) => apiClient.post<HrJobLevel>("/hr/org/levels", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgLevels() }),
  });
}

export function useUpdateJobLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "level", "update"],
    mutationFn: ({ jobLevelId, ...jobLevel }: OrgCatalogInput & { jobLevelId: number }) =>
      apiClient.patch<HrJobLevel>(`/hr/org/levels/${jobLevelId}`, jobLevel),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgLevels() }),
  });
}

export function useDeleteJobLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "org", "level", "delete"],
    mutationFn: (jobLevelId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/org/levels/${jobLevelId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.orgLevels() }),
  });
}

export function useOrgHeadcount(groupBy: "department" | "location" | "role" = "department") {
  const canEmployees = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.orgHeadcount(groupBy),
    queryFn: ({ signal }) => apiClient.get<HrHeadcountGroup[]>("/hr/org/headcount", { groupBy }, signal),
    staleTime: 5 * 60_000,
    enabled: hrEnabled && canEmployees,
  });
}
