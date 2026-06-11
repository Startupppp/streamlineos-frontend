
import { SUPER_ADMIN_ROLES as CANONICAL_SUPER_ADMIN_ROLES } from "@/lib/rbac/permissions";

export const ROLES = {
  OWNER: "OWNER",
  CEO: "CEO",
  HR: "HR",
  ADMIN: "ADMIN",
  SALES: "SALES",
  ENGINEERING: "ENGINEERING",
  DESIGN: "DESIGN",
  CUSTOMER_SUPPORT: "CUSTOMER_SUPPORT",
  VIDEO_EDITOR: "VIDEO_EDITOR",
  DIGITAL_MARKETING: "DIGITAL_MARKETING",
  BLOG_EDITOR: "BLOG_EDITOR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const SUPER_ADMIN_ROLES: readonly string[] = CANONICAL_SUPER_ADMIN_ROLES;

export const ADMIN_ROLES: readonly string[] = [
  ROLES.OWNER,
  ROLES.CEO,
  ROLES.HR,
  ROLES.ADMIN,
];

export const EXPENSE_ADMIN_ROLES: readonly string[] = [
  ROLES.OWNER,
  ROLES.CEO,
  ROLES.HR,
  ROLES.ADMIN,
];

export const BLOG_ADMIN_ROLES: readonly string[] = [
  ROLES.OWNER,
  ROLES.CEO,
  ROLES.HR,
  ROLES.BLOG_EDITOR,
];

export function isBlogAdmin(role: string | undefined | null): boolean {
  return !!role && BLOG_ADMIN_ROLES.includes(role);
}

export const ALL_ROLES: readonly string[] = Object.values(ROLES);

export function isAdminOrOwner(role: string | undefined | null): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

export function isCEO(role: string | undefined | null): boolean {
  return role === ROLES.CEO;
}

export function isOwner(role: string | undefined | null): boolean {
  return role === ROLES.OWNER;
}

export function isExpenseAdmin(role: string | undefined | null): boolean {
  return !!role && EXPENSE_ADMIN_ROLES.includes(role);
}
