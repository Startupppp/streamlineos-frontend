"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  OrgBusinessUnit,
  OrgBranch,
  OrgDepartment,
  OrgTeam,
} from "@/types/org-hierarchy";

const businessUnitListContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.businessUnitListContract),
);
const businessUnitContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.businessUnitContract),
);
const orgBranchListContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.orgBranchListContract),
);
const orgBranchContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.orgBranchContract),
);
const departmentListContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.departmentListContract),
);
const departmentContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.departmentContract),
);
const teamListContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.teamListContract),
);
const teamContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.teamContract),
);

export interface CursorResponse<T> {
  data: T[];
  pageInfo: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface ListQuery extends Record<string, unknown> {
  cursor?: string;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "DISABLED" | "ARCHIVED" | "CURRENT";
}

// ─── Business Units ──────────────────────────────────────────────────────────

export function useBusinessUnits(query?: ListQuery) {
  return useGatedQuery("settings:view", {
    queryKey: platformHierarchyQueryKeys.hierarchy.businessUnits(query),
    queryFn: ({ signal }) =>
      apiClient.get<CursorResponse<OrgBusinessUnit>>("/org-hierarchy/business-units", {
        ...(query?.cursor ? { cursor: query.cursor } : {}),
        limit: String(query?.limit ?? 100),
        ...(query?.search ? { search: query.search } : {}),
        ...(query?.status ? { status: query.status } : {}),
      }, signal, businessUnitListContract),
    staleTime: 60_000,
  });
}

export function useCreateBusinessUnit() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:organization:manage", {
    mutationKey: ["create", "business", "unit"],
    mutationFn: (data: { name: string; code: string; description?: string }) =>
      apiClient.post<OrgBusinessUnit>("/org-hierarchy/business-units", data, undefined, businessUnitContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.hierarchy.all }),
  });
}

export function useUpdateBusinessUnit() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:organization:manage", {
    mutationKey: ["update", "business", "unit"],
    mutationFn: ({ id, ...data }: { id: string; name?: string; code?: string; description?: string; status?: string }) =>
      apiClient.patch<OrgBusinessUnit>(`/org-hierarchy/business-units/${id}`, data, undefined, businessUnitContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.hierarchy.all }),
  });
}

// ─── Org Branches ────────────────────────────────────────────────────────────

export function useOrgBranches(
  query?: ListQuery,
  options?: Omit<UseQueryOptions<CursorResponse<OrgBranch>, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("settings:view");
  return useQuery({
    queryKey: platformHierarchyQueryKeys.hierarchy.orgBranches(query),
    queryFn: ({ signal }) =>
      apiClient.get<CursorResponse<OrgBranch>>("/org-hierarchy/branches", {
        ...(query?.cursor ? { cursor: query.cursor } : {}),
        limit: String(query?.limit ?? 100),
        ...(query?.search ? { search: query.search } : {}),
        ...(query?.status ? { status: query.status } : {}),
      }, signal, orgBranchListContract),
    staleTime: 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useCreateOrgBranch() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:organization:manage", {
    mutationKey: ["create", "org", "branch"],
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<OrgBranch>("/org-hierarchy/branches", data, undefined, orgBranchContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.hierarchy.all }),
  });
}

export function useUpdateOrgBranch() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:organization:manage", {
    mutationKey: ["update", "org", "branch"],
    mutationFn: ({ branchId, ...data }: { branchId: string } & Record<string, unknown>) =>
      apiClient.patch<OrgBranch>(`/org-hierarchy/branches/${branchId}`, data, undefined, orgBranchContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.hierarchy.all }),
  });
}

// ─── Departments ─────────────────────────────────────────────────────────────

export function useOrgDepartments(
  query?: ListQuery,
  options?: Omit<UseQueryOptions<CursorResponse<OrgDepartment>, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("settings:view");
  return useQuery({
    queryKey: platformHierarchyQueryKeys.hierarchy.departments(query),
    queryFn: ({ signal }) =>
      apiClient.get<CursorResponse<OrgDepartment>>("/org-hierarchy/departments", {
        ...(query?.cursor ? { cursor: query.cursor } : {}),
        limit: String(query?.limit ?? 100),
        ...(query?.search ? { search: query.search } : {}),
        ...(query?.status ? { status: query.status } : {}),
      }, signal, departmentListContract),
    staleTime: 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useCreateOrgDepartment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:organization:manage", {
    mutationKey: ["create", "org", "department"],
    mutationFn: (data: { name: string; code: string; branchId?: string; headUserId?: string; description?: string }) =>
      apiClient.post<OrgDepartment>("/org-hierarchy/departments", data, undefined, departmentContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.hierarchy.all }),
  });
}

export function useUpdateOrgDepartment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:organization:manage", {
    mutationKey: ["update", "org", "department"],
    mutationFn: ({ departmentId, ...data }: { departmentId: string } & Record<string, unknown>) =>
      apiClient.patch<OrgDepartment>(`/org-hierarchy/departments/${departmentId}`, data, undefined, departmentContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.hierarchy.all }),
  });
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export function useOrgTeams(query?: ListQuery) {
  const canView = useCan("settings:view");
  return useQuery({
    queryKey: platformHierarchyQueryKeys.hierarchy.teams(query),
    queryFn: ({ signal }) =>
      apiClient.get<CursorResponse<OrgTeam>>("/org-hierarchy/teams", {
        ...(query?.cursor ? { cursor: query.cursor } : {}),
        limit: String(query?.limit ?? 100),
        ...(query?.search ? { search: query.search } : {}),
        ...(query?.status ? { status: query.status } : {}),
      }, signal, teamListContract),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useCreateOrgTeam() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:organization:manage", {
    mutationKey: ["create", "org", "team"],
    mutationFn: (data: { name: string; code: string; departmentId: string; leadUserId?: string; description?: string; capacity?: number }) =>
      apiClient.post<OrgTeam>("/org-hierarchy/teams", data, undefined, teamContract),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.hierarchy.all }),
  });
}

export function useUpdateOrgTeam() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:organization:manage", {
    mutationKey: ["update", "org", "team"],
    mutationFn: ({ teamId, ...data }: { teamId: string } & Record<string, unknown>) =>
      apiClient.patch<OrgTeam>(`/org-hierarchy/teams/${teamId}`, data, undefined, teamContract),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.hierarchy.all }),
  });
}
