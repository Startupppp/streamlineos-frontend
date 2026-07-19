export interface Employee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  image: string | null;
  designation: string | null;
  isActive: boolean;
  hasDashboardAccess: boolean;
  department?: { id: number; name: string } | null;
}

export type UserRole = string;

/** @deprecated Use EmployeeStatusFilter from employee-list-filters */
export type StatusFilter = "All" | "Active" | "Inactive";

/** @deprecated Use role string + "all" from employee-list-filters */
export type RoleFilter =
  | "All"
  | "CEO"
  | "HR"
  | "SALES"
  | "CUSTOMER_SUPPORT"
  | "ENGINEERING"
  | "DESIGN"
  | "VIDEO_EDITOR"
  | "DIGITAL_MARKETING";

export type { EmployeeStatusFilter } from "./employee-list-filters";

export const ROLE_LABELS: Record<string, string> = {
  CEO: "CEO",
  HR: "HR",
  SALES: "Sales",
  CUSTOMER_SUPPORT: "Customer Support",
  ENGINEERING: "Engineering",
  DESIGN: "Design",
  VIDEO_EDITOR: "Video Editor",
  DIGITAL_MARKETING: "Digital Marketing",
};

export const PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

const PROTECTED_TARGET_ROLES = new Set(["CEO", "OWNER", "ADMIN"]);

export function canDeleteEmployee(
  targetRole: UserRole,
  targetId: string,
  targetIsActive: boolean,
  currentId: string | undefined,
  canManageEmployees: boolean,
): boolean {
  if (!targetIsActive) return false;
  if (targetId === currentId) return false;
  if (PROTECTED_TARGET_ROLES.has(targetRole)) return false;
  return canManageEmployees;
}

export function getDisplayName(employee: Employee): string {
  if (employee.firstName)
    return `${employee.firstName} ${employee.lastName ?? ""}`.trim();
  return employee.email;
}

export function getInitials(employee: Employee): string {
  if (employee.firstName && employee.lastName) {
    return `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();
  }
  return employee.email.charAt(0).toUpperCase();
}
