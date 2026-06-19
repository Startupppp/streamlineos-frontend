
export const ROLES = {
  OWNER: "OWNER",
  CEO: "CEO",
  ADMIN: "ADMIN",
  HR: "HR",
  HR_MANAGER: "HR_MANAGER",
  BRANCH_HR: "BRANCH_HR",
  MANAGER: "MANAGER",
  BRANCH_MANAGER: "BRANCH_MANAGER",
  SALES: "SALES",
  SALES_MANAGER: "SALES_MANAGER",
  ENGINEERING: "ENGINEERING",
  DESIGN: "DESIGN",
  CUSTOMER_SUPPORT: "CUSTOMER_SUPPORT",
  VIDEO_EDITOR: "VIDEO_EDITOR",
  DIGITAL_MARKETING: "DIGITAL_MARKETING",
  BLOG_EDITOR: "BLOG_EDITOR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ADMIN_ROLES: readonly string[] = [
  ROLES.OWNER,
  ROLES.CEO,
  ROLES.HR,
];

export const EXPENSE_ADMIN_ROLES: readonly string[] = [
  ROLES.OWNER,
  ROLES.CEO,
  ROLES.HR,
];

export const BLOG_ADMIN_ROLES: readonly string[] = [
  ROLES.OWNER,
  ROLES.CEO,
  ROLES.HR,
  ROLES.BLOG_EDITOR,
];

export const ALL_ROLES: readonly string[] = Object.values(ROLES);

export function isCEO(role: string | undefined | null): boolean {
  return role === ROLES.CEO;
}

export function isOwner(role: string | undefined | null): boolean {
  return role === ROLES.OWNER;
}

