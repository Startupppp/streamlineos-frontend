"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { apiClient } from "@/lib/api-client";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
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
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { lazyContract } from "@/lib/api-envelope";

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const hierarchyTreeContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.hierarchyTreeContract),
);
const hierarchyParentListContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.hierarchyParentListContract),
);
const dependencyPreviewContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.dependencyPreviewContract),
);
const hierarchyOverviewContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.hierarchyOverviewContract),
);
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
const locationListContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.locationListContract),
);
const locationContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.locationContract),
);
const costCenterListContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.costCenterListContract),
);
const costCenterContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.costCenterContract),
);
const holidayListContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.holidayListContract),
);
const createHolidayContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.createHolidayContract),
);

export interface CursorResponse<T> {
  data: T[];
  pageInfo: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

interface ListQuery extends Record<string, unknown> {
  cursor?: string;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "DISABLED" | "ARCHIVED" | "CURRENT";
}

export type HierarchyParentKind =
  | "BUSINESS_UNIT"
  | "BRANCH"
  | "DEPARTMENT";

export interface HierarchyParentRecord {
  id: string;
  name: string;
  status: string;
  deletedAt: string | null;
}

const HIERARCHY_PARENT_ENDPOINTS: Record<HierarchyParentKind, string> = {
  BUSINESS_UNIT: "/org-hierarchy/business-units",
  BRANCH: "/org-hierarchy/branches",
  DEPARTMENT: "/org-hierarchy/departments",
};

const HIERARCHY_PARENT_PAGE_SIZE = 25;

export function useHierarchyParentOptions(
  parentKind: HierarchyParentKind,
  search: string,
  enabled = true,
) {
  const canView = useCan("settings:view");
  const normalizedSearch = search.trim();

  return useInfiniteQuery({
    queryKey: platformHierarchyQueryKeys.hierarchy.parentOptions(parentKind, normalizedSearch),
    queryFn: ({ pageParam, signal }) => {
      const qParams = {
        ...(pageParam !== "" ? { cursor: pageParam } : {}),
        limit: String(HIERARCHY_PARENT_PAGE_SIZE),
        ...(normalizedSearch ? { search: normalizedSearch } : {}),
        status: "ACTIVE",
      };
      if (parentKind === "BUSINESS_UNIT")
        return apiClient.get<CursorResponse<HierarchyParentRecord>>("/org-hierarchy/business-units", qParams, signal, hierarchyParentListContract);
      if (parentKind === "BRANCH")
        return apiClient.get<CursorResponse<HierarchyParentRecord>>("/org-hierarchy/branches", qParams, signal, hierarchyParentListContract);
      return apiClient.get<CursorResponse<HierarchyParentRecord>>("/org-hierarchy/departments", qParams, signal, hierarchyParentListContract);
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasMore
        ? (lastPage.pageInfo.nextCursor ?? undefined)
        : undefined,
    staleTime: 60_000,
    enabled: canView && enabled,
  });
}

export function getOrgUnitDependencyPreview(
  unitKind: OrgUnitKind,
  unitId: string,
) {
  return apiClient.get<OrgUnitDependencyPreview>(
    `/org-hierarchy/dependencies/${unitKind}/${unitId}`,
    { mode: "archive" },
    undefined,
    dependencyPreviewContract,
  );
}

// ─── Overview & Tree ─────────────────────────────────────────────────────────

export function useOrgTree() {
  const canView = useCan("settings:view");
  return useQuery({
    queryKey: platformHierarchyQueryKeys.hierarchy.tree(),
    queryFn: ({ signal }) =>
      apiClient.get<OrgTreeNode[]>("/org-hierarchy/tree", undefined, signal, hierarchyTreeContract),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useOrgHierarchyOverview(
  options?: Omit<UseQueryOptions<OrgHierarchyOverview, Error>, "queryKey" | "queryFn">,
) {
  return useGatedQuery("settings:view", {
    queryKey: platformHierarchyQueryKeys.hierarchy.all,
    queryFn: ({ signal }) => apiClient.get<OrgHierarchyOverview>("/org-hierarchy/overview", undefined, signal, hierarchyOverviewContract),
    staleTime: 60_000,
    ...options,
  });
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

// ─── Locations ───────────────────────────────────────────────────────────────

export function useOrgLocations(query?: ListQuery) {
  return useGatedQuery("settings:view", {
    queryKey: platformHierarchyQueryKeys.hierarchy.locations(query),
    queryFn: ({ signal }) =>
      apiClient.get<CursorResponse<OrgLocation>>("/org-hierarchy/locations", {
        ...(query?.cursor ? { cursor: query.cursor } : {}),
        limit: String(query?.limit ?? 100),
        ...(query?.search ? { search: query.search } : {}),
        ...(query?.status ? { status: query.status } : {}),
      }, signal, locationListContract),
    staleTime: 60_000,
  });
}

export function useCreateOrgLocation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:organization:manage", {
    mutationKey: ["create", "org", "location"],
    mutationFn: (data: { name: string; type?: string; address?: string; latitude?: number; longitude?: number }) =>
      apiClient.post<OrgLocation>("/org-hierarchy/locations", data, undefined, locationContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.hierarchy.all }),
  });
}

export function useUpdateOrgLocation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:organization:manage", {
    mutationKey: ["update", "org", "location"],
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch<OrgLocation>(`/org-hierarchy/locations/${id}`, data, undefined, locationContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.hierarchy.all }),
  });
}

// ─── Cost Centers ─────────────────────────────────────────────────────────────

export function useOrgCostCenters(query?: ListQuery) {
  return useGatedQuery("settings:view", {
    queryKey: platformHierarchyQueryKeys.hierarchy.costCenters(query),
    queryFn: ({ signal }) =>
      apiClient.get<CursorResponse<OrgCostCenter>>(
        "/org-hierarchy/cost-centers",
        {
          ...(query?.cursor ? { cursor: query.cursor } : {}),
          limit: String(query?.limit ?? 100),
          ...(query?.search ? { search: query.search } : {}),
          ...(query?.status ? { status: query.status } : {}),
        }, signal, costCenterListContract,
      ),
    staleTime: 60_000,
  });
}

export function useCreateOrgCostCenter() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:organization:manage", {
    mutationKey: ["create", "org", "cost", "center"],
    mutationFn: (data: { code: string; name: string; description?: string }) =>
      apiClient.post<OrgCostCenter>("/org-hierarchy/cost-centers", data, undefined, costCenterContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.hierarchy.all }),
  });
}

export function useUpdateOrgCostCenter() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:organization:manage", {
    mutationKey: ["update", "org", "cost", "center"],
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch<OrgCostCenter>(`/org-hierarchy/cost-centers/${id}`, data, undefined, costCenterContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.hierarchy.all }),
  });
}

// ─── Organization Holidays ────────────────────────────────────────────────────

export interface OrgHoliday {
  id: string;
  name: string;
  date: string;
  recurring: boolean;
  createdAt: string;
}

export interface AddHolidayInput {
  name: string;
  date: string;
  recurring?: boolean;
}

export function useOrgHolidays(
  options?: Omit<UseQueryOptions<OrgHoliday[], Error>, "queryKey" | "queryFn">,
) {
  const canViewSettings = useCan("settings:view");
  return useQuery<OrgHoliday[]>({
    queryKey: platformCoreQueryKeys.organization.holidays,
    queryFn: ({ signal }) =>
      apiClient.get<OrgHoliday[]>("/organization/holidays", undefined, signal, holidayListContract),
    staleTime: 5 * 60_000,
    ...options,
    enabled: canViewSettings && (options?.enabled ?? true),
  });
}

export function useCreateOrgHoliday(
  options?: Omit<UseMutationOptions<OrgHoliday, Error, AddHolidayInput>, "mutationKey" | "mutationFn">,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<OrgHoliday, Error, AddHolidayInput>("settings:manage", {
    mutationKey: ["org", "holidays", "create"],
    mutationFn: (input: AddHolidayInput) =>
      apiClient.post<OrgHoliday>("/organization/holidays", input, undefined, createHolidayContract),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: platformCoreQueryKeys.organization.holidays });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useDeleteOrgHoliday(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationKey" | "mutationFn">,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, string>("settings:manage", {
    mutationKey: ["org", "holidays", "delete"],
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/organization/holidays/${id}`, undefined, undefined, noContentContract),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: platformCoreQueryKeys.organization.holidays });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}
