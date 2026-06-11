
import { SYSTEM_ROLES, type SystemRole } from "./permissions";

export { SYSTEM_ROLES, type SystemRole };

export const ROLE_LABELS: Record<SystemRole, string> = {
  OWNER: "Owner",
  CEO: "CEO",
  HR: "HR Manager",
  SALES: "Sales Executive",
  CUSTOMER_SUPPORT: "Customer Support",
  ENGINEERING: "Engineer",
  DESIGN: "Designer",
  VIDEO_EDITOR: "Video Editor",
  DIGITAL_MARKETING: "Digital Marketing",
  BLOG_EDITOR: "Blog Editor",
  BRANCH_MANAGER: "Branch Manager",
  BRANCH_HR: "Branch HR",
};

export const ADMIN_ROLES: ReadonlyArray<SystemRole> = ["OWNER", "CEO", "HR"] as const;

export const BRANCH_ROLES: ReadonlyArray<SystemRole> = ["BRANCH_MANAGER", "BRANCH_HR"] as const;

export const CRM_ROLES: ReadonlyArray<SystemRole> = ["OWNER", "CEO", "HR", "SALES", "BRANCH_MANAGER", "BRANCH_HR"] as const;

export function isSystemRole(role: string | undefined | null): role is SystemRole {
  return SYSTEM_ROLES.includes(role as SystemRole);
}

export function isAdminRole(role: string | undefined | null): boolean {
  return ADMIN_ROLES.includes(role as SystemRole);
}

export function isBranchRole(role: string | undefined | null): boolean {
  return BRANCH_ROLES.includes(role as SystemRole);
}

export function getRoleLabel(role: string | undefined | null): string {
  if (!role || !isSystemRole(role)) return role ?? "Unknown";
  return ROLE_LABELS[role];
}
