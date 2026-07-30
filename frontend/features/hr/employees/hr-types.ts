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
  department?: { id: string; name: string } | null;
}

export const PAGE_SIZE = 10;

const PROTECTED_TARGET_ROLES = new Set(["FINAL", "OWNER", "ADMIN"]);

export function canDeleteEmployee(
  targetRole: string,
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
