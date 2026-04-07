/**
 * Centralized role constants. Import these instead of using hardcoded strings.
 */
export const ROLES = {
  CEO: "CEO",
  HR: "HR",
  ADMIN: "ADMIN",
  SALES: "SALES",
  ENGINEERING: "ENGINEERING",
  DESIGN: "DESIGN",
  CUSTOMER_SUPPORT: "CUSTOMER_SUPPORT",
  VIDEO_EDITOR: "VIDEO_EDITOR",
  DIGITAL_MARKETING: "DIGITAL_MARKETING",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Roles with full admin privileges */
export const ADMIN_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR];

/** Roles that can approve/manage expenses */
export const EXPENSE_ADMIN_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN];

/** All defined system roles */
export const ALL_ROLES: readonly string[] = Object.values(ROLES);
