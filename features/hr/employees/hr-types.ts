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
  department: { id: number; name: string } | null;
}

export type UserRole = string;
export type StatusFilter = "All" | "Active" | "Inactive";
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

export function canDeleteEmployee(
  targetRole: UserRole,
  targetId: string,
  currentRole: string | undefined,
  currentId: string | undefined,
): boolean {
  if (targetId === currentId) return false;
  if (currentRole === "CEO") return targetRole !== "CEO";
  if (currentRole === "HR") return targetRole !== "CEO" && targetRole !== "HR";
  return false;
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
