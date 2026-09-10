import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
import { orgSettingsContract } from "@/hooks/api/org-settings-schema";
import {
  businessUnitListContract,
  orgBranchListContract,
  departmentListContract,
  teamListContract,
  locationListContract,
  costCenterListContract,
  hierarchyTreeContract,
  hierarchyOverviewContract,
} from "@/hooks/api/org-hierarchy-schema";
import { roleContract, roleMembersContract } from "@/hooks/api/roles-schema";
import { userApiTokenPageContract } from "@/hooks/api/user-api-tokens-schema";

const HIERARCHY_STALE_TIME = 60_000;
const HIERARCHY_INIT_PARAMS = {
  limit: DEFAULT_PAGE_SIZE,
  status: "CURRENT",
} as const;

export async function prefetchOrgSettings() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: platformCoreQueryKeys.organization.settings(),
    queryFn: () => serverGet("/organization/settings", orgSettingsContract),
    staleTime: 30 * 60_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchOrgBranches() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: platformHierarchyQueryKeys.hierarchy.orgBranches(HIERARCHY_INIT_PARAMS),
    queryFn: () =>
      serverGet(
        `/org-hierarchy/branches?limit=${DEFAULT_PAGE_SIZE}&status=CURRENT`,
        orgBranchListContract,
      ),
    staleTime: HIERARCHY_STALE_TIME,
  });
  return dehydrate(queryClient);
}

export async function prefetchBusinessUnits() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: platformHierarchyQueryKeys.hierarchy.businessUnits(HIERARCHY_INIT_PARAMS),
    queryFn: () =>
      serverGet(
        `/org-hierarchy/business-units?limit=${DEFAULT_PAGE_SIZE}&status=CURRENT`,
        businessUnitListContract,
      ),
    staleTime: HIERARCHY_STALE_TIME,
  });
  return dehydrate(queryClient);
}

export async function prefetchOrgDepartments() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: platformHierarchyQueryKeys.hierarchy.departments(HIERARCHY_INIT_PARAMS),
    queryFn: () =>
      serverGet(
        `/org-hierarchy/departments?limit=${DEFAULT_PAGE_SIZE}&status=CURRENT`,
        departmentListContract,
      ),
    staleTime: HIERARCHY_STALE_TIME,
  });
  return dehydrate(queryClient);
}

export async function prefetchOrgTeams() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: platformHierarchyQueryKeys.hierarchy.teams(HIERARCHY_INIT_PARAMS),
    queryFn: () =>
      serverGet(
        `/org-hierarchy/teams?limit=${DEFAULT_PAGE_SIZE}&status=CURRENT`,
        teamListContract,
      ),
    staleTime: HIERARCHY_STALE_TIME,
  });
  return dehydrate(queryClient);
}

export async function prefetchOrgLocations() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: platformHierarchyQueryKeys.hierarchy.locations(HIERARCHY_INIT_PARAMS),
    queryFn: () =>
      serverGet(
        `/org-hierarchy/locations?limit=${DEFAULT_PAGE_SIZE}&status=CURRENT`,
        locationListContract,
      ),
    staleTime: HIERARCHY_STALE_TIME,
  });
  return dehydrate(queryClient);
}

export async function prefetchOrgCostCenters() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: platformHierarchyQueryKeys.hierarchy.costCenters(HIERARCHY_INIT_PARAMS),
    queryFn: () =>
      serverGet(
        `/org-hierarchy/cost-centers?limit=${DEFAULT_PAGE_SIZE}&status=CURRENT`,
        costCenterListContract,
      ),
    staleTime: HIERARCHY_STALE_TIME,
  });
  return dehydrate(queryClient);
}

export async function prefetchOrgTree() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: platformHierarchyQueryKeys.hierarchy.tree(),
    queryFn: () => serverGet("/org-hierarchy/tree", hierarchyTreeContract),
    staleTime: 30_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchOrgStructure() {
  const queryClient = await createServerQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: platformHierarchyQueryKeys.hierarchy.all,
      queryFn: () => serverGet("/org-hierarchy/overview", hierarchyOverviewContract),
      staleTime: HIERARCHY_STALE_TIME,
    }),
    queryClient.prefetchQuery({
      queryKey: platformCoreQueryKeys.organization.settings(),
      queryFn: () => serverGet("/organization/settings", orgSettingsContract),
      staleTime: 30 * 60_000,
    }),
  ]);
  return dehydrate(queryClient);
}

export async function prefetchRoleDetail(roleIdStr: string) {
  const roleId = Number(roleIdStr);
  const queryClient = await createServerQueryClient();
  if (Number.isFinite(roleId) && roleId > 0) {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: accessAndCrmQueryKeys.roles.detail(roleId),
        queryFn: () => serverGet(`/roles/${roleId}`, roleContract),
        staleTime: 30 * 60_000,
      }),
      queryClient.prefetchQuery({
        queryKey: accessAndCrmQueryKeys.roles.members(roleId),
        queryFn: () => serverGet(`/roles/${roleId}/members`, roleMembersContract),
        staleTime: 5 * 60_000,
      }),
    ]);
  }
  return dehydrate(queryClient);
}

export async function prefetchUserApiTokens() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: usersAndCommerceQueryKeys.userApiTokens.list({ limit: DEFAULT_PAGE_SIZE }),
    queryFn: () =>
      serverGet(`/me/api-tokens?limit=${DEFAULT_PAGE_SIZE}`, userApiTokenPageContract),
    staleTime: 30_000,
  });
  return dehydrate(queryClient);
}
