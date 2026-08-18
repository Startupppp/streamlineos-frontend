/**
 * Shared employee directory query contract for /hr and /hr/employees.
 *
 * URL params (source of truth):
 *   q       — search string (name, email, employee ID, designation)
 *   dept    — departmentId as number string
 *   status  — active | inactive | all  (maps to API isActive true|false|all)
 *   role    — user.role or "all"
 *   page    — 1-based page
 *   size    — page size
 *
 * Status is only isActive-backed. There is no separate "terminated" API flag;
 * terminated people appear under inactive (isActive=false).
 */

import type { HrEmployeesParams } from "@/hooks/api/hr/employees";

export type EmployeeStatusFilter = "active" | "inactive" | "all";

export type EmployeeListFilters = {
  q: string;
  departmentId: string | undefined;
  status: EmployeeStatusFilter;
  role: string; // "all" or role key e.g. ENGINEERING
  size: number;
};

export const DEFAULT_STATUS: EmployeeStatusFilter = "active";
export const DEFAULT_PAGE_SIZE = 20;

export function parseStatus(raw: string | null): EmployeeStatusFilter {
  if (raw === "inactive" || raw === "all" || raw === "active") return raw;
  // Legacy / mistaken values
  if (raw === "Inactive" || raw === "terminated") return "inactive";
  if (raw === "Active") return "active";
  if (raw === "All") return "all";
  return DEFAULT_STATUS;
}

export function parseDepartmentId(raw: string | null): string | undefined {
  if (!raw || raw === "all" || raw === "All") return undefined;
  return raw;
}

export function parseEmployeeListFilters(
  searchParams: URLSearchParams,
  defaults?: { size?: number; status?: EmployeeStatusFilter },
): EmployeeListFilters {
  const sizeDefault = defaults?.size ?? DEFAULT_PAGE_SIZE;
  const statusDefault = defaults?.status ?? DEFAULT_STATUS;

  const sizeRaw = Number(searchParams.get("size") || searchParams.get("limit"));
  const size =
    Number.isFinite(sizeRaw) && sizeRaw > 0 && sizeRaw <= 100
      ? sizeRaw
      : sizeDefault;

  const statusParam = searchParams.get("status");
  const status =
    statusParam == null || statusParam === ""
      ? statusDefault
      : parseStatus(statusParam);

  const roleRaw = searchParams.get("role");
  const role =
    !roleRaw || roleRaw === "all" || roleRaw === "All" ? "all" : roleRaw;

  return {
    q: searchParams.get("q") || "",
    departmentId: parseDepartmentId(searchParams.get("dept")),
    status,
    role,
    size,
  };
}

/** Map UI filters → GET /hr/employees query params. */
export function toHrEmployeesApiParams(
  filters: EmployeeListFilters,
): HrEmployeesParams {
  return {
    limit: filters.size,
    search: filters.q.trim() || undefined,
    departmentId: filters.departmentId,
    isActive:
      filters.status === "active"
        ? "true"
        : filters.status === "inactive"
          ? "false"
          : "all",
    role: filters.role !== "all" ? filters.role : undefined,
  };
}

/** Whether any non-default filter is active (for Clear + empty states). */
export function hasActiveEmployeeFilters(
  filters: EmployeeListFilters,
  defaults?: { status?: EmployeeStatusFilter },
): boolean {
  return countActiveEmployeeFilters(filters, defaults) > 0;
}

/** How many non-default filters are active (for a compact filter-count badge). */
export function countActiveEmployeeFilters(
  filters: EmployeeListFilters,
  defaults?: { status?: EmployeeStatusFilter },
): number {
  const statusDefault = defaults?.status ?? DEFAULT_STATUS;
  return [
    filters.q.trim() !== "",
    filters.departmentId != null,
    filters.status !== statusDefault,
    filters.role !== "all",
  ].filter(Boolean).length;
}

/** Build URL updates for router; null deletes the key. */
export function employeeFiltersToUrlUpdates(
  next: Partial<EmployeeListFilters> & {
    q?: string | null;
    status?: EmployeeStatusFilter | null;
    role?: string | null;
    departmentId?: string | null;
    size?: number | null;
  },
  defaults?: { size?: number; status?: EmployeeStatusFilter },
): Record<string, string | null> {
  const sizeDefault = defaults?.size ?? DEFAULT_PAGE_SIZE;
  const statusDefault = defaults?.status ?? DEFAULT_STATUS;
  const out: Record<string, string | null> = {};

  if ("q" in next) {
    const q = (next.q ?? "").trim();
    out.q = q || null;
  }
  if ("departmentId" in next) {
    out.dept = next.departmentId || null;
  }
  if ("status" in next) {
    const s = next.status ?? statusDefault;
    out.status = s === statusDefault ? null : s;
  }
  if ("role" in next) {
    out.role = !next.role || next.role === "all" ? null : next.role;
  }
  if ("size" in next) {
    out.size =
      !next.size || next.size === sizeDefault ? null : String(next.size);
  }
  return out;
}
