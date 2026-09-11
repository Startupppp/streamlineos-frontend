"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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
    queryKey: queryKeys.hierarchy.parentOptions(parentKind, normalizedSearch),
    queryFn: ({ pageParam: cursor }) =>
      apiClient.get<CursorResponse<HierarchyParentRecord>>(
        HIERARCHY_PARENT_ENDPOINTS[parentKind],
        {
          ...(cursor ? { cursor } : {}),
          limit: String(HIERARCHY_PARENT_PAGE_SIZE),
          ...(normalizedSearch ? { search: normalizedSearch } : {}),
          status: "ACTIVE",
        },
      ),
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

// ─── Locations ───────────────────────────────────────────────────────────────

export function useOrgLocations(query?: ListQuery) {
  return useQuery({
    queryKey: queryKeys.hierarchy.locations(query),
    queryFn: () =>
      apiClient.get<CursorResponse<OrgLocation>>("/org-hierarchy/locations", {
        ...(query?.cursor ? { cursor: query.cursor } : {}),
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
      apiClient.get<CursorResponse<OrgCostCenter>>(
        "/org-hierarchy/cost-centers",
        {
          ...(query?.cursor ? { cursor: query.cursor } : {}),
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
