"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { apiClient } from "@/lib/api-client";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { useCan } from "@/hooks/api/access";
import type {
  OrgLocation,
  OrgCostCenter,
  OrgHierarchyOverview,
  OrgTreeNode,
  OrgUnitDependencyPreview,
  OrgUnitKind,
} from "@/types/org-hierarchy";
import type { CursorResponse, ListQuery } from "./org-hierarchy-units";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { lazyContract } from "@/lib/api-envelope";

export {
  useBusinessUnits,
  useCreateBusinessUnit,
  useUpdateBusinessUnit,
  useOrgBranches,
  useCreateOrgBranch,
  useUpdateOrgBranch,
  useOrgDepartments,
  useCreateOrgDepartment,
  useUpdateOrgDepartment,
  useOrgTeams,
  useCreateOrgTeam,
  useUpdateOrgTeam,
} from "./org-hierarchy-units";

export type { CursorResponse, ListQuery } from "./org-hierarchy-units";

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
