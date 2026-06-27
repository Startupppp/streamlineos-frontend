"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  OrgBusinessUnit,
  OrgBranch,
  OrgDepartment,
  OrgTeam,
  OrgLocation,
  OrgCostCenter,
  OrgHierarchyOverview,
} from "@/types/org-hierarchy";

// ─── Overview ────────────────────────────────────────────────────────────────

export function useOrgHierarchyOverview() {
  return useQuery({
    queryKey: queryKeys.hierarchy.all,
    queryFn: () => apiClient.get<OrgHierarchyOverview>("/org-hierarchy/overview"),
    staleTime: 60_000,
  });
}

// ─── Business Units ──────────────────────────────────────────────────────────

export function useBusinessUnits() {
  return useQuery({
    queryKey: queryKeys.hierarchy.businessUnits(),
    queryFn: () => apiClient.get<OrgBusinessUnit[]>("/org-hierarchy/business-units"),
    staleTime: 60_000,
  });
}

export function useCreateBusinessUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; code: string; description?: string }) =>
      apiClient.post<OrgBusinessUnit>("/org-hierarchy/business-units", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.businessUnits() }),
  });
}

export function useUpdateBusinessUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; code?: string; description?: string; status?: string }) =>
      apiClient.patch<OrgBusinessUnit>(`/org-hierarchy/business-units/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.businessUnits() }),
  });
}

export function useDeleteBusinessUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ message: string }>(`/org-hierarchy/business-units/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.businessUnits() }),
  });
}

// ─── Org Branches ────────────────────────────────────────────────────────────

export function useOrgBranches() {
  return useQuery({
    queryKey: queryKeys.hierarchy.orgBranches(),
    queryFn: () => apiClient.get<OrgBranch[]>("/org-hierarchy/branches"),
    staleTime: 60_000,
  });
}

export function useCreateOrgBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<OrgBranch>("/org-hierarchy/branches", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.orgBranches() }),
  });
}

export function useUpdateOrgBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch<OrgBranch>(`/org-hierarchy/branches/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.orgBranches() }),
  });
}

export function useDeleteOrgBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ message: string }>(`/org-hierarchy/branches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.orgBranches() }),
  });
}

// ─── Departments ─────────────────────────────────────────────────────────────

export function useOrgDepartments() {
  return useQuery({
    queryKey: queryKeys.hierarchy.departments(),
    queryFn: () => apiClient.get<OrgDepartment[]>("/org-hierarchy/departments"),
    staleTime: 60_000,
  });
}

export function useCreateOrgDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; code: string; branchId?: string; headUserId?: string; description?: string }) =>
      apiClient.post<OrgDepartment>("/org-hierarchy/departments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.departments() }),
  });
}

export function useUpdateOrgDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch<OrgDepartment>(`/org-hierarchy/departments/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.departments() }),
  });
}

export function useDeleteOrgDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ message: string }>(`/org-hierarchy/departments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.departments() }),
  });
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export function useOrgTeams() {
  return useQuery({
    queryKey: queryKeys.hierarchy.teams(),
    queryFn: () => apiClient.get<OrgTeam[]>("/org-hierarchy/teams"),
    staleTime: 60_000,
  });
}

export function useCreateOrgTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; code: string; departmentId?: string; leadUserId?: string; description?: string; capacity?: number }) =>
      apiClient.post<OrgTeam>("/org-hierarchy/teams", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.teams() }),
  });
}

export function useUpdateOrgTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch<OrgTeam>(`/org-hierarchy/teams/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.teams() }),
  });
}

export function useDeleteOrgTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ message: string }>(`/org-hierarchy/teams/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.teams() }),
  });
}

// ─── Locations ───────────────────────────────────────────────────────────────

export function useOrgLocations() {
  return useQuery({
    queryKey: queryKeys.hierarchy.locations(),
    queryFn: () => apiClient.get<OrgLocation[]>("/org-hierarchy/locations"),
    staleTime: 60_000,
  });
}

export function useCreateOrgLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type?: string; address?: string; latitude?: number; longitude?: number }) =>
      apiClient.post<OrgLocation>("/org-hierarchy/locations", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.locations() }),
  });
}

export function useUpdateOrgLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch<OrgLocation>(`/org-hierarchy/locations/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.locations() }),
  });
}

export function useDeleteOrgLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ message: string }>(`/org-hierarchy/locations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.locations() }),
  });
}

// ─── Cost Centers ─────────────────────────────────────────────────────────────

export function useOrgCostCenters() {
  return useQuery({
    queryKey: queryKeys.hierarchy.costCenters(),
    queryFn: () => apiClient.get<OrgCostCenter[]>("/org-hierarchy/cost-centers"),
    staleTime: 60_000,
  });
}

export function useCreateOrgCostCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; name: string; description?: string }) =>
      apiClient.post<OrgCostCenter>("/org-hierarchy/cost-centers", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.costCenters() }),
  });
}

export function useUpdateOrgCostCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch<OrgCostCenter>(`/org-hierarchy/cost-centers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.costCenters() }),
  });
}

export function useDeleteOrgCostCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ message: string }>(`/org-hierarchy/cost-centers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.costCenters() }),
  });
}
