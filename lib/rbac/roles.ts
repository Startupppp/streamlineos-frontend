/**
 * Type-safe role constants and metadata.
 * Role permissions are defined in lib/rbac/permissions.ts.
 */
import { SYSTEM_ROLES, type SystemRole } from "./permissions";

export { SYSTEM_ROLES, type SystemRole };

/** Human-readable display label for each system role. */
export const ROLE_LABELS: Record<SystemRole, string> = {
  CEO: "CEO",
  HR: "HR Manager",
  SALES: "Sales Executive",
  CUSTOMER_SUPPORT: "Customer Support",
  ENGINEERING: "Engineer",
  DESIGN: "Designer",
  VIDEO_EDITOR: "Video Editor",
  DIGITAL_MARKETING: "Digital Marketing",
  BRANCH_MANAGER: "Branch Manager",
  BRANCH_HR: "Branch HR",
};

/** Roles that have admin-level access (can manage org settings, users, etc.) */
export const ADMIN_ROLES: ReadonlyArray<SystemRole> = ["CEO", "HR"] as const;

/** Roles scoped to a specific branch. */
export const BRANCH_ROLES: ReadonlyArray<SystemRole> = ["BRANCH_MANAGER", "BRANCH_HR"] as const;

/** Roles that work in CRM / sales pipelines. */
export const CRM_ROLES: ReadonlyArray<SystemRole> = ["CEO", "HR", "SALES", "BRANCH_MANAGER", "BRANCH_HR"] as const;

/** Check if a role string is a valid SystemRole. */
export function isSystemRole(role: string | undefined | null): role is SystemRole {
  return SYSTEM_ROLES.includes(role as SystemRole);
}

/** Check if a role has admin privileges. */
export function isAdminRole(role: string | undefined | null): boolean {
  return ADMIN_ROLES.includes(role as SystemRole);
}

/** Check if a role is a branch-scoped role. */
export function isBranchRole(role: string | undefined | null): boolean {
  return BRANCH_ROLES.includes(role as SystemRole);
}

/** Get display label for a role, falling back to the raw value. */
export function getRoleLabel(role: string | undefined | null): string {
  if (!role || !isSystemRole(role)) return role ?? "Unknown";
  return ROLE_LABELS[role];
}
