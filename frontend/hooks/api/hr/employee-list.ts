"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

const employeeListPageLazy = lazyContract(() =>
  import("@/hooks/api/hr/employee-list-schema").then((m) => m.employeeListPageContract),
);
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import type {
  EmployeeCursorPage,
  EmployeeListItem,
  PaginatedEmployees,
} from "@/types/hr";

export type HrEmployeesParams = {
  cursor?: string;
  limit?: number;
  search?: string;
  departmentId?: string;
  isActive?: "true" | "false" | "all";
  /** Server-side role filter (users.role). */
  role?: string;
};

export function normalizeEmployeesResponse(
  res: EmployeeListItem[] | PaginatedEmployees | EmployeeCursorPage | null | undefined,
  fallbackLimit = 20,
): PaginatedEmployees {
  if (!res) {
    return {
      data: [],
      pagination: { page: 1, limit: fallbackLimit, total: 0, totalPages: 0 },
    };
  }
  if (Array.isArray(res)) {
    return {
      data: res,
      pagination: {
        page: 1,
        limit: res.length || fallbackLimit,
        total: res.length,
        totalPages: res.length > 0 ? 1 : 0,
      },
    };
  }
  if ("pageInfo" in res) {
    const data = Array.isArray(res.data) ? res.data : [];
    return {
      data,
      pagination: {
        page: 1,
        limit: res.pageInfo.limit,
        total: data.length,
        totalPages: data.length > 0 ? 1 : 0,
      },
    };
  }
  const data = Array.isArray(res.data) ? res.data : [];
  const pagination = res.pagination ?? {
    page: 1,
    limit: data.length || fallbackLimit,
    total: data.length,
    totalPages: data.length > 0 ? 1 : 0,
  };
  return { data, pagination };
}

/** Safe list extract for pickers / legacy call sites. */
export function unwrapEmployees(
  res: EmployeeListItem[] | PaginatedEmployees | EmployeeCursorPage | null | undefined,
): EmployeeListItem[] {
  return normalizeEmployeesResponse(res).data;
}

export function normalizeEmployeeCursorResponse(
  res: EmployeeListItem[] | EmployeeCursorPage | null | undefined,
  fallbackLimit = 20,
): EmployeeCursorPage {
  if (!res || Array.isArray(res)) {
    const data = res ?? [];
    return {
      data,
      pageInfo: {
        limit: data.length || fallbackLimit,
        hasMore: false,
        nextCursor: null,
      },
    };
  }
  return {
    data: Array.isArray(res.data) ? res.data : [],
    pageInfo: res.pageInfo,
  };
}

export function useHrEmployees(
  params?: HrEmployeesParams,
  options?: { enabled?: boolean },
) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  const limit = params?.limit ?? 20;
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.employees(params),
    queryFn: async ({ signal }): Promise<EmployeeCursorPage> => {
      const res = await apiClient.get<EmployeeCursorPage>(
        "/hr/employees",
        params,
        signal,
        employeeListPageLazy,
      );
      return normalizeEmployeeCursorResponse(res, limit);
    },
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView && (options?.enabled ?? true),
  });
}

export function useInfiniteHrEmployees(
  params?: Omit<HrEmployeesParams, "cursor">,
  options?: { enabled?: boolean },
) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  const limit = params?.limit ?? 20;
  return useInfiniteQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.employees(params),
      "pages",
    ] as const,
    queryFn: async ({ pageParam, signal }: { pageParam: string | undefined; signal: AbortSignal }): Promise<EmployeeCursorPage> => {
      const res = await apiClient.get<EmployeeCursorPage>(
        "/hr/employees",
        { ...params, cursor: pageParam },
        signal,
        employeeListPageLazy,
      );
      return normalizeEmployeeCursorResponse(res, limit);
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.pageInfo.nextCursor ?? undefined,
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView && (options?.enabled ?? true),
  });
}

export function useHrEmployeeOptions(
  params?: Omit<HrEmployeesParams, "cursor"> & { enabled?: boolean },
) {
  const canView = useCan("hr:employees:view");
  const { enabled, ...rest } = params ?? {};
  const merged = { limit: 100, isActive: "true" as const, ...rest };
  const query = useHrEmployees(
    { ...merged, limit: Math.min(merged.limit, 100) },
    { enabled: canView && (enabled ?? true) },
  );
  return {
    ...query,
    employees: unwrapEmployees(query.data),
  };
}
