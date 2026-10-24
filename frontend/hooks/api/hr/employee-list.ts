"use client";

import { keepPreviousData, useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
import { employeeListQueryOptions } from "./employee-list-read-options";

const employeeListPageLazy = lazyContract(() =>
  import("@/hooks/api/hr/employee-list-schema").then((m) => m.employeeListPageContract),
);
const employeeCountsLazy = lazyContract(() =>
  import("@/hooks/api/hr/employee-list-schema").then((m) => m.employeeCountsContract),
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
  isActive?: "true" | "false" | "all" | "pending" | "current";
  role?: string;
};

export type HrEmployeeCountsParams = Pick<HrEmployeesParams, "search" | "departmentId" | "role">;

export interface HrEmployeeCounts {
  active: number;
  pending: number;
  inactive: number;
}

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
    ...employeeListQueryOptions(params),
    queryFn: async ({ signal }): Promise<EmployeeCursorPage> => {
      const res = await apiClient.get<EmployeeCursorPage>(
        "/hr/employees",
        params,
        signal,
        employeeListPageLazy,
      );
      return normalizeEmployeeCursorResponse(res, limit);
    },
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
    placeholderData: keepPreviousData,
    ...INLINE_READ_ERROR,
    enabled: hrEnabled && canView && (options?.enabled ?? true),
  });
}

export function useHrEmployeeCounts(params: HrEmployeeCountsParams) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.employeeCounts(params),
    queryFn: ({ signal }) =>
      apiClient.get<HrEmployeeCounts>("/hr/employees/counts", params, signal, employeeCountsLazy),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: hrEnabled && canView,
    ...INLINE_READ_ERROR,
  });
}

export function useHrEmployeeOptions(
  params?: Omit<HrEmployeesParams, "cursor"> & { enabled?: boolean },
) {
  const canView = useCan("hr:employees:view");
  const { enabled, ...rest } = params ?? {};
  const merged = { limit: DEFAULT_PAGE_SIZE, isActive: "current" as const, ...rest };
  const query = useHrEmployees(
    { ...merged, limit: Math.min(merged.limit, DEFAULT_PAGE_SIZE) },
    { enabled: canView && (enabled ?? true) },
  );
  return {
    ...query,
    employees: unwrapEmployees(query.data),
  };
}
