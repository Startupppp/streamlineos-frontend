import type { AuditLogFilters } from "@/hooks/api/audit-log";

export const RBAC_AUDIT_ACTIONS = [
  "role.changed",
  "role.permissions.set",
  "role.member.added",
  "role.member.removed",
  "role.assigned",
  "role.unassigned",
  "role.created",
  "role.updated",
  "role.deleted",
  "permission.granted",
  "permission.revoked",
] as const;

export const RBAC_AUDIT_PAGE_SIZE = 25;

// The route has no filter URL, so its first-mount filters are a constant both halves share.
export const RBAC_AUDIT_INITIAL_FILTERS: AuditLogFilters = {
  cursor: undefined,
  limit: RBAC_AUDIT_PAGE_SIZE,
  actions: RBAC_AUDIT_ACTIONS,
};
