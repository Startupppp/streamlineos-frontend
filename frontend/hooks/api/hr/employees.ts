"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { invalidateHrWorkforceQueries } from "@/lib/hr-workforce-cache";
import type {
  Department,
  Employee,
  EmployeeCursorPage,
  PaginatedEmployees,
  EmployeeStats,
  CreateDepartmentInput,
  UpdateProfileInput,
  OnboardEmployeeInput,
  BulkOnboardEmployeeRow,
  BulkOnboardResult,
} from "@/types/hr";
import type {
  HrEmployment,
  HrTimelineResponse,
  HrSensitiveData,
} from "@/types/hr/core";

export function useHrDepartments(options?: { enabled?: boolean }) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.departments(),
    queryFn: ({ signal }) => apiClient.get<Department[]>("/hr/departments", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView && (options?.enabled ?? true),
  });
}

export interface LegacyDepartment {
  id: number;
  name: string;
}

export function useLegacyHrDepartments() {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.legacyDepartments(),
    queryFn: ({ signal }) => apiClient.get<LegacyDepartment[]>("/hr/departments/legacy", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "departments", "create"],
    mutationFn: (data: CreateDepartmentInput) =>
      apiClient.post<Department>("/hr/departments", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.departments() });
      void qc.invalidateQueries({
        queryKey: queryKeys.hr.onboardingTemplateDepartments(),
      });
    },
  });
}

export type HrEmployeesParams = {
  cursor?: string;
  limit?: number;
  search?: string;
  departmentId?: string;
  isActive?: "true" | "false" | "all";
  /** Server-side role filter (users.role). */
  role?: string;
};

/**
 * Normalize any employees API payload to PaginatedEmployees.
 * Backend always returns `{ data, pagination }`; older clients may still see arrays.
 */
export function normalizeEmployeesResponse(
  res: Employee[] | PaginatedEmployees | EmployeeCursorPage | null | undefined,
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
  res: Employee[] | PaginatedEmployees | EmployeeCursorPage | null | undefined,
): Employee[] {
  return normalizeEmployeesResponse(res).data;
}

export function normalizeEmployeeCursorResponse(
  res: Employee[] | EmployeeCursorPage | null | undefined,
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

export function useHrEmployees(params?: HrEmployeesParams, options?: { enabled?: boolean }) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  const limit = params?.limit ?? 20;
  return useQuery({
    queryKey: queryKeys.hr.employees(params),
    queryFn: async ({ signal }): Promise<EmployeeCursorPage> => {
      const res = await apiClient.get<Employee[] | EmployeeCursorPage>(
        "/hr/employees",
        params,
        signal,
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
    queryKey: [...queryKeys.hr.employees(params), "pages"] as const,
    queryFn: async ({ pageParam, signal }): Promise<EmployeeCursorPage> => {
      const res = await apiClient.get<Employee[] | EmployeeCursorPage>(
        "/hr/employees",
        { ...params, cursor: pageParam },
        signal,
      );
      return normalizeEmployeeCursorResponse(res, limit);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pageInfo.nextCursor ?? undefined,
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView && (options?.enabled ?? true),
  });
}

/**
 * Convenience for employee pickers (selects, assign dialogs).
 * Fetches a large page and always returns a flat Employee[].
 */
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

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:update", {
    mutationKey: ["hr", "employees", "update"],
    mutationFn: ({ userId, ...data }: UpdateProfileInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${userId}`, data),
    onSuccess: (_, { userId }) => {
      void invalidateHrWorkforceQueries(qc, userId);
    },
  });
}

export function useHrEmployeeStats(userId: string) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.employeeStats(userId),
    queryFn: ({ signal }) =>
      apiClient.get<EmployeeStats>("/hr/employees/stats", { userId }, signal),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && !!userId && canView,
  });
}

export function useHrEmployeeProjects(userId: string) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...queryKeys.hr.all, "employeeProjects", userId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<Record<string, unknown>[]>("/hr/employees/projects", { userId }, signal),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && !!userId && canView,
  });
}

export function useHrEmployeeTickets(userId: string) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...queryKeys.hr.all, "employeeTickets", userId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<{ data: Record<string, unknown>[] }>("/hr/employees/tickets", { userId }, signal),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && !!userId && canView,
  });
}

export function useOnboardEmployee() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:onboarding:manage", {
    mutationKey: ["hr", "employee", "onboard"],
    mutationFn: (data: OnboardEmployeeInput) =>
      apiClient.post<{ success: boolean; userId: string }>("/hr/employees/onboard", data),
    onSuccess: (result) => invalidateHrWorkforceQueries(qc, result.userId),
  });
}

export function useBulkOnboardEmployees() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:onboarding:manage", {
    mutationKey: ["hr", "employee", "onboard", "bulk"],
    mutationFn: (employees: BulkOnboardEmployeeRow[]) =>
      apiClient.post<BulkOnboardResult>(
        "/hr/employees/onboard/bulk",
        { employees },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () => invalidateHrWorkforceQueries(qc),
  });
}


type AvailabilityStatus = "ON_LEAVE" | "HALF_DAY" | "AVAILABLE";

interface AvailabilityEntry {
  userId: string;
  status: AvailabilityStatus;
  leaveType?: string;
}

export function useEmployeeAvailability(userIds?: string[]) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  const param = userIds ? userIds.join(",") : undefined;
  return useQuery({
    queryKey: [...queryKeys.hr.all, "availability", param] as const,
    queryFn: ({ signal }) =>
      apiClient.get<AvailabilityEntry[]>("/hr/employees/availability", param ? { userIds: param } : undefined, signal),
    staleTime: 5 * 60_000,
    enabled: hrEnabled && canView,
  });
}



export interface ExpertResult {
  userId: string;
  name: string | null;
  image: string | null;
  designation: string | null;
  department: string | null;
  role: string | null;
  skills: { name: string; level: number }[];
  matchedSkill: string;
  matchedLevel: number;
}

interface FindExpertParams {
  skill: string;
  department?: string;
  role?: string;
}

export function useFindExpert(params: FindExpertParams) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...queryKeys.hr.all, "findExpert", params] as const,
    queryFn: ({ signal }) => apiClient.get<ExpertResult[]>("/hr/employees/find-expert", params as unknown as Record<string, string>, signal),
    enabled: hrEnabled && canView && params.skill.trim().length > 0,
    staleTime: 2 * 60_000,
  });
}

export interface SkillsMatrixData {
  employees: {
    userId: string;
    name: string | null;
    image: string | null;
    skills: Record<string, number>;
  }[];
  skills: string[];
  pageInfo: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

interface SkillsMatrixParams {
  cursor?: string;
  limit?: number;
  enabled?: boolean;
}

export function useSkillsMatrix(params: SkillsMatrixParams = {}) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  const { cursor, limit = 20, enabled = true } = params;
  const requestParams = { cursor, limit };
  return useQuery({
    queryKey: [...queryKeys.hr.all, "skillsMatrix", requestParams] as const,
    queryFn: ({ signal }) =>
      apiClient.get<SkillsMatrixData>(
        "/hr/employees/skills-matrix",
        requestParams, signal,
      ),
    staleTime: 60_000,
    enabled: hrEnabled && canView && enabled,
  });
}


interface DirectReport {
  id: string;
  name: string | null;
  image: string | null;
  designation: string | null;
  email: string;
}

export function useDirectReports(employeeId: string) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...queryKeys.hr.all, "directReports", employeeId] as const,
    queryFn: ({ signal }) => apiClient.get<DirectReport[]>(`/hr/employees/${employeeId}/reports-to-me`, undefined, signal),
    enabled: hrEnabled && !!employeeId && canView,
    staleTime: 5 * 60_000,
  });
}


interface ManagerScorecard {
  managerId: string;
  teamSize: number;
  avgPerformanceRating: number | null;
  teamAttendanceRate: number | null;
  pendingLeaveRequests: number;
  directReports: Array<{
    id: string;
    name: string | null;
    image: string | null;
    designation: string | null;
    avgRating: number | null;
  }>;
}

export function useManagerScorecard(employeeId: string) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...queryKeys.hr.all, "managerScorecard", employeeId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<ManagerScorecard>(`/hr/employees/${employeeId}/manager-scorecard`, undefined, signal),
    enabled: hrEnabled && !!employeeId && canView,
    staleTime: 5 * 60_000,
  });
}

export function useEmployeeEmployment(userId: string) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.employeeEmployment(userId),
    queryFn: ({ signal }) => apiClient.get<HrEmployment>(`/hr/employees/${userId}/employment`, undefined, signal),
    enabled: hrEnabled && !!userId && canView,
    staleTime: 5 * 60_000,
  });
}

export function useEmployeeTimeline(
  employmentId: number | undefined,
  params?: { limit?: number },
) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  const limit = params?.limit ?? 20;
  return useInfiniteQuery({
    queryKey: queryKeys.hr.employeeTimeline(employmentId ?? 0, { limit }),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<HrTimelineResponse>(
        `/hr/employees/${employmentId}/timeline`,
        {
          limit,
          ...(pageParam ? { cursor: pageParam } : {}),
        }, signal,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.pageInfo.nextCursor ?? undefined,
    enabled: hrEnabled && !!employmentId && canView,
    staleTime: 2 * 60_000,
  });
}

export function useEmployeeSensitive(employmentId: number | undefined) {
  const canViewSensitive = useCan("hr:sensitive:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.employeeSensitive(employmentId ?? 0),
    queryFn: ({ signal }) => apiClient.get<HrSensitiveData>(`/hr/employees/${employmentId}/sensitive`, undefined, signal),
    enabled: hrEnabled && !!employmentId && canViewSensitive,
    staleTime: 30_000,
  });
}

export function useUpdateSensitive(employmentId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:sensitive:manage", {
    mutationKey: ["hr", "employee", "sensitive", "update", employmentId],
    mutationFn: (data: Partial<HrSensitiveData>) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${employmentId}/sensitive`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.employeeSensitive(employmentId) }),
  });
}

