import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { resolvePrefetchGate } from "./prefetch-gate";
import { serverGet } from "@/lib/server-fetch";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { normalizeOrgModulesResponse } from "@/hooks/api/access/org-modules-normalize";
import {
  delegationListQuery,
  type DelegationListParams,
} from "@/hooks/api/delegations-request";
import type { AuditLogFilters } from "@/hooks/api/audit-log";
import type { UserListParams } from "@/hooks/api/users/types";
import { orgModuleStatusesContract } from "@/hooks/api/access/module-status-schema";
import {
  auditLogActionsContract,
  auditLogListContract,
  auditLogTargetTypesContract,
} from "@/hooks/api/audit-log-schema";
import { delegationsPageContract } from "@/hooks/api/delegations-schema";
import { rbacDiscoveryMembersContract } from "@/hooks/api/access-schema";
import { simulationCandidatesPageContract } from "@/hooks/api/roles-schema";
import { usersResponseContract } from "@/hooks/api/users/extended-users-schema";
import { userStatsContract } from "@/hooks/api/users/users-schema";
import { webhookListContract } from "@/hooks/api/webhooks-schema";
import { SIMULATION_CANDIDATE_PARAMS } from "@/lib/settings-initial-reads";

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== "") search.set(key, value);
  return search.toString();
}

export function auditLogListQuery(filters: AuditLogFilters): string {
  return query({
    cursor: filters.cursor,
    limit: filters.limit ? String(filters.limit) : undefined,
    action: filters.action,
    actions: filters.actions?.length ? filters.actions.join(",") : undefined,
    targetType: filters.targetType,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    userSearch: filters.userSearch,
  });
}

export function usersListQuery(params: UserListParams): string {
  return query({
    cursor: params.cursor,
    limit: params.limit ? String(params.limit) : undefined,
    search: params.search,
    status: params.status,
    role: params.role,
    departmentId: params.departmentId,
    branchId: params.branchId,
    teamId: params.teamId,
    managerUserId: params.managerUserId,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
}

export async function prefetchOrgModules() {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  if (gate.can("settings:manage"))
    await queryClient.prefetchQuery({
      queryKey: platformCoreQueryKeys.access.orgModules(),
      queryFn: async () =>
        normalizeOrgModulesResponse(
          await serverGet("/access/org-modules", orgModuleStatusesContract),
        ),
      staleTime: 60_000,
    });
  return dehydrate(queryClient);
}

export async function prefetchSettingsUsers(params: UserListParams) {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  if (gate.can("settings:view"))
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: usersAndCommerceQueryKeys.users.list(params),
        queryFn: () => serverGet(`/v2/users?${usersListQuery(params)}`, usersResponseContract),
        staleTime: 30_000,
      }),
      queryClient.prefetchQuery({
        queryKey: usersAndCommerceQueryKeys.users.stats(),
        queryFn: () => serverGet("/users/stats", userStatsContract),
        staleTime: 60_000,
      }),
    ]);
  return dehydrate(queryClient);
}

export async function prefetchSettingsWebhooks(params: {
  cursor?: string;
  limit: number;
}) {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  if (gate.can("settings:webhooks:manage"))
    await queryClient.prefetchQuery({
      queryKey: supportAndWorkflowsQueryKeys.webhooks.list(params),
      queryFn: () =>
        serverGet(
          `/webhooks?${query({ cursor: params.cursor, limit: String(params.limit) })}`,
          webhookListContract,
        ),
      staleTime: 60_000,
    });
  return dehydrate(queryClient);
}

export async function prefetchSettingsAuditLog(filters: AuditLogFilters) {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  if (gate.can("audit-log:read"))
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: accessAndCrmQueryKeys.auditLog.list(filters),
        queryFn: () => serverGet(`/audit-log?${auditLogListQuery(filters)}`, auditLogListContract),
        staleTime: 30_000,
      }),
      queryClient.prefetchQuery({
        queryKey: accessAndCrmQueryKeys.auditLog.actions(),
        queryFn: () => serverGet("/audit-log/actions", auditLogActionsContract),
        staleTime: 10 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: accessAndCrmQueryKeys.auditLog.targetTypes(),
        queryFn: () =>
          serverGet("/audit-log/target-types", auditLogTargetTypesContract),
        staleTime: 10 * 60 * 1000,
      }),
    ]);
  return dehydrate(queryClient);
}

export async function prefetchRolesAudit(filters: AuditLogFilters) {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  if (gate.can("audit-log:read"))
    await queryClient.prefetchQuery({
      queryKey: accessAndCrmQueryKeys.auditLog.list(filters),
      queryFn: () => serverGet(`/audit-log?${auditLogListQuery(filters)}`, auditLogListContract),
      staleTime: 30_000,
    });
  return dehydrate(queryClient);
}

export async function prefetchSettingsDelegations(
  received: DelegationListParams,
  given: DelegationListParams,
) {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  if (gate.can("settings:rbac:manage"))
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: supportAndWorkflowsQueryKeys.delegations.received(received),
        queryFn: () =>
          serverGet(
            `/access/delegations?${delegationListQuery(received)}`,
            delegationsPageContract,
          ),
        staleTime: 60_000,
      }),
      queryClient.prefetchQuery({
        queryKey: supportAndWorkflowsQueryKeys.delegations.given(given),
        queryFn: () =>
          serverGet(
            `/access/delegations/given?${delegationListQuery(given)}`,
            delegationsPageContract,
          ),
        staleTime: 60_000,
      }),
      queryClient.prefetchQuery({
        queryKey: accessAndCrmQueryKeys.roles.discoveryMembers(),
        queryFn: () => serverGet("/rbac/discovery/members", rbacDiscoveryMembersContract),
        staleTime: 5 * 60_000,
      }),
    ]);
  return dehydrate(queryClient);
}

export async function prefetchRoleSimulation() {
  const queryClient = await createServerQueryClient();
  const gate = await resolvePrefetchGate();
  if (gate.can("settings:rbac:manage"))
    await queryClient.prefetchQuery({
      queryKey: platformCoreQueryKeys.access.simulationCandidates(
        SIMULATION_CANDIDATE_PARAMS,
      ),
      queryFn: () =>
        serverGet(
          `/roles/simulate/candidates?limit=${SIMULATION_CANDIDATE_PARAMS.limit}`,
          simulationCandidatesPageContract,
        ),
      staleTime: 30_000,
    });
  return dehydrate(queryClient);
}
