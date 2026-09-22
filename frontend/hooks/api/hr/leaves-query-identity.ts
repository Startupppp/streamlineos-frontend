"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { QueryKeyParams } from "@/lib/query-keys/base";
import { useAccess } from "@/hooks/api/access";

export const LEAVE_TYPES_KEY = [...humanResourcesQueryKeys.hr.all, "leaveTypesAdmin"] as const;

export function useLeaveQueryIdentity() {
  const { data: session } = useSession();
  const { data: access } = useAccess();
  return {
    orgId: session?.orgId ?? "",
    userId: session?.user?.id ?? "",
    accessVersion: access?.version ?? 0,
  };
}

export type LeaveIdentity = ReturnType<typeof useLeaveQueryIdentity>;

export function leaveContextKey(identity: LeaveIdentity) {
  return humanResourcesQueryKeys.hr.leaves(identity.orgId, identity.userId, identity.accessVersion);
}

export function leaveTeamKey(identity: LeaveIdentity, params?: QueryKeyParams) {
  const prefix = humanResourcesQueryKeys.hr.leavesTeam(identity.orgId, identity.userId, identity.accessVersion);
  return params === undefined ? prefix : ([...prefix, params] as const);
}

export function leaveThisWeekKey(identity: LeaveIdentity) {
  return humanResourcesQueryKeys.hr.leavesThisWeek(identity.orgId, identity.userId, identity.accessVersion);
}

export function leaveMyRequestsKey(identity: LeaveIdentity) {
  return humanResourcesQueryKeys.hr.leavesMyRequests(identity.orgId, identity.userId, identity.accessVersion);
}

export function leaveMyRequestsPagesKey(identity: LeaveIdentity) {
  return humanResourcesQueryKeys.hr.leavesMyRequestsPages(identity.orgId, identity.userId, identity.accessVersion);
}

export function useInvalidateLeaveDashboard() {
  const qc = useQueryClient();

  return function invalidateLeaveDashboard() {
    void qc.invalidateQueries({
      queryKey: collaborationQueryKeys.dashboard.leavesToday(),
      exact: true,
    });
    void qc.invalidateQueries({
      queryKey: collaborationQueryKeys.dashboard.myLeaveBalance(),
      exact: true,
    });
    void qc.invalidateQueries({
      queryKey: collaborationQueryKeys.dashboard.pendingApprovals(),
      exact: true,
    });
  };
}
