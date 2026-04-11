
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

export const ADMIN_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR];

export const EXPENSE_ADMIN_ROLES: readonly string[] = [ROLES.CEO, ROLES.HR, ROLES.ADMIN];

export const ALL_ROLES: readonly string[] = Object.values(ROLES);
