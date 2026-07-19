import { apiClient } from "@/lib/api-client";
import {
  normalizeEmployeesResponse,
  type HrEmployeesParams,
} from "@/hooks/api/hr/employees";
import type { Employee, PaginatedEmployees } from "@/types/hr";

const PAGE_LIMIT = 100;
const MAX_ROWS = 5_000;

/**
 * Fetch every employee matching the same filters as the list (paginated server query).
 * Caps at MAX_ROWS to avoid runaway exports.
 */
export async function fetchAllEmployeesForExport(
  base: Omit<HrEmployeesParams, "page" | "limit">,
): Promise<Employee[]> {
  const all: Employee[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && all.length < MAX_ROWS) {
    const res = await apiClient.get<Employee[] | PaginatedEmployees>(
      "/hr/employees",
      {
        ...base,
        page,
        limit: PAGE_LIMIT,
      } as Record<string, unknown>,
    );
    const normalized = normalizeEmployeesResponse(res, PAGE_LIMIT);
    all.push(...normalized.data);
    totalPages = Math.max(1, normalized.pagination.totalPages);
    if (normalized.data.length === 0) break;
    page += 1;
  }

  return all.slice(0, MAX_ROWS);
}

export function mapEmployeesToExportRows(employees: Employee[]) {
  return employees.map((e) => ({
    name:
      e.firstName && e.lastName
        ? `${e.firstName} ${e.lastName}`
        : (e.name ?? e.email),
    email: e.email,
    employeeId: e.employeeId ?? "",
    designation: e.designation ?? "",
    role: e.role ?? "",
    department: e.department?.name ?? "",
    status: e.isActive !== false ? "Active" : "Inactive",
  }));
}

export const EMPLOYEE_EXPORT_COLUMNS = [
  { header: "Name", key: "name", width: 24 },
  { header: "Email", key: "email", width: 28 },
  { header: "Employee ID", key: "employeeId", width: 14 },
  { header: "Designation", key: "designation", width: 20 },
  { header: "Role", key: "role", width: 16 },
  { header: "Department", key: "department", width: 18 },
  { header: "Status", key: "status", width: 12 },
] as const;
