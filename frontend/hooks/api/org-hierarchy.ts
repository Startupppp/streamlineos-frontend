"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  OrgBusinessUnit,
  OrgBranch,
  OrgDepartment,
  OrgTeam,
  OrgLocation,
  OrgCostCenter,
  OrgHierarchyOverview,
  OrgTreeNode,
  OrgUnitDependencyPreview,
  OrgUnitKind,
} from "@/types/org-hierarchy";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface ListQuery extends Record<string, unknown> {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "DISABLED" | "ARCHIVED" | "CURRENT";
}

export function getOrgUnitDependencyPreview(
  unitKind: OrgUnitKind,
  unitId: string,
) {
  return apiClient.get<OrgUnitDependencyPreview>(
    `/org-hierarchy/dependencies/${unitKind}/${unitId}`,
    { mode: "archive" },
  );
}

// ─── Overview & Tree ─────────────────────────────────────────────────────────

export function useOrgTree() {
  const canView = useCan("settings:view");
  return useQuery({
    queryKey: queryKeys.hierarchy.tree(),
    queryFn: () => apiClient.get<OrgTreeNode[]>("/org-hierarchy/tree"),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useOrgHierarchyOverview(
  options?: Omit<UseQueryOptions<OrgHierarchyOverview, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: queryKeys.hierarchy.all,
    queryFn: () => apiClient.get<OrgHierarchyOverview>("/org-hierarchy/overview"),
    staleTime: 60_000,
    ...options,
  });
}

// ─── Business Units ──────────────────────────────────────────────────────────

export function useBusinessUnits(query?: ListQuery) {
  return useQuery({
    queryKey: queryKeys.hierarchy.businessUnits(query),
    queryFn: () =>
      apiClient.get<PaginatedResponse<OrgBusinessUnit>>("/org-hierarchy/business-units", {
        page: String(query?.page ?? 1),
        limit: String(query?.limit ?? 100),
        ...(query?.search ? { search: query.search } : {}),
        ...(query?.status ? { status: query.status } : {}),
      }),
    staleTime: 60_000,
  });
}

export function useCreateBusinessUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["create", "business", "unit"],
    mutationFn: (data: { name: string; code: string; description?: string }) =>
      apiClient.post<OrgBusinessUnit>("/org-hierarchy/business-units", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  });
}

export function useUpdateBusinessUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["update", "business", "unit"],
    mutationFn: ({ id, ...data }: { id: string; name?: string; code?: string; description?: string; status?: string }) =>
      apiClient.patch<OrgBusinessUnit>(`/org-hierarchy/business-units/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  });
}

// ─── Org Branches ────────────────────────────────────────────────────────────

export function useOrgBranches(
  query?: ListQuery,
  options?: Omit<UseQueryOptions<PaginatedResponse<OrgBranch>, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("settings:view");
  return useQuery({
    queryKey: queryKeys.hierarchy.orgBranches(query),
    queryFn: () =>
      apiClient.get<PaginatedResponse<OrgBranch>>("/org-hierarchy/branches", {
        page: String(query?.page ?? 1),
        limit: String(query?.limit ?? 100),
        ...(query?.search ? { search: query.search } : {}),
        ...(query?.status ? { status: query.status } : {}),
      }),
    staleTime: 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useCreateOrgBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["create", "org", "branch"],
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<OrgBranch>("/org-hierarchy/branches", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  });
}

export function useUpdateOrgBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["update", "org", "branch"],
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch<OrgBranch>(`/org-hierarchy/branches/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  });
}

// ─── Departments ─────────────────────────────────────────────────────────────

export function useOrgDepartments(
  query?: ListQuery,
  options?: Omit<UseQueryOptions<PaginatedResponse<OrgDepartment>, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("settings:view");
  return useQuery({
    queryKey: queryKeys.hierarchy.departments(query),
    queryFn: () =>
      apiClient.get<PaginatedResponse<OrgDepartment>>("/org-hierarchy/departments", {
        page: String(query?.page ?? 1),
        limit: String(query?.limit ?? 100),
        ...(query?.search ? { search: query.search } : {}),
        ...(query?.status ? { status: query.status } : {}),
      }),
    staleTime: 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useCreateOrgDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["create", "org", "department"],
    mutationFn: (data: { name: string; code: string; branchId?: string; headUserId?: string; description?: string }) =>
      apiClient.post<OrgDepartment>("/org-hierarchy/departments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  });
}

export function useUpdateOrgDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["update", "org", "department"],
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch<OrgDepartment>(`/org-hierarchy/departments/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  });
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export function useOrgTeams(query?: ListQuery) {
  const canView = useCan("settings:view");
  return useQuery({
    queryKey: queryKeys.hierarchy.teams(query),
    queryFn: () =>
      apiClient.get<PaginatedResponse<OrgTeam>>("/org-hierarchy/teams", {
        page: String(query?.page ?? 1),
        limit: String(query?.limit ?? 100),
        ...(query?.search ? { search: query.search } : {}),
        ...(query?.status ? { status: query.status } : {}),
      }),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useCreateOrgTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["create", "org", "team"],
    mutationFn: (data: { name: string; code: string; departmentId: string; leadUserId?: string; description?: string; capacity?: number }) =>
      apiClient.post<OrgTeam>("/org-hierarchy/teams", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  });
}

export function useUpdateOrgTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["update", "org", "team"],
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch<OrgTeam>(`/org-hierarchy/teams/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  });
}

// ─── Locations ───────────────────────────────────────────────────────────────

export function useOrgLocations(query?: ListQuery) {
  return useQuery({
    queryKey: queryKeys.hierarchy.locations(query),
    queryFn: () =>
      apiClient.get<PaginatedResponse<OrgLocation>>("/org-hierarchy/locations", {
        page: String(query?.page ?? 1),
        limit: String(query?.limit ?? 100),
        ...(query?.search ? { search: query.search } : {}),
        ...(query?.status ? { status: query.status } : {}),
      }),
    staleTime: 60_000,
  });
}

export function useCreateOrgLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["create", "org", "location"],
    mutationFn: (data: { name: string; type?: string; address?: string; latitude?: number; longitude?: number }) =>
      apiClient.post<OrgLocation>("/org-hierarchy/locations", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  });
}

export function useUpdateOrgLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["update", "org", "location"],
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch<OrgLocation>(`/org-hierarchy/locations/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  });
}

// ─── Cost Centers ─────────────────────────────────────────────────────────────

export function useOrgCostCenters(query?: ListQuery) {
  return useQuery({
    queryKey: queryKeys.hierarchy.costCenters(query),
    queryFn: () =>
      apiClient.get<PaginatedResponse<OrgCostCenter>>(
        "/org-hierarchy/cost-centers",
        {
          page: String(query?.page ?? 1),
          limit: String(query?.limit ?? 100),
          ...(query?.search ? { search: query.search } : {}),
          ...(query?.status ? { status: query.status } : {}),
        },
      ),
    staleTime: 60_000,
  });
}

export function useCreateOrgCostCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["create", "org", "cost", "center"],
    mutationFn: (data: { code: string; name: string; description?: string }) =>
      apiClient.post<OrgCostCenter>("/org-hierarchy/cost-centers", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  });
}

export function useUpdateOrgCostCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["update", "org", "cost", "center"],
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch<OrgCostCenter>(`/org-hierarchy/cost-centers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hierarchy.all }),
  });
}
