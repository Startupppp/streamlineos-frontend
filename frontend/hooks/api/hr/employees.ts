"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Department,
  Employee,
  OrgChartNode,
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
  HrEffectiveDatedChange,
} from "@/types/hr/core";

export function useHrDepartments() {
  return useQuery({
    queryKey: queryKeys.hr.departments(),
    queryFn: () => apiClient.get<Department[]>("/hr/departments"),
    staleTime: 2 * 60_000,
  });
}

export interface LegacyDepartment {
  id: number;
  name: string;
}

export function useLegacyHrDepartments() {
  return useQuery({
    queryKey: queryKeys.hr.legacyDepartments(),
    queryFn: () => apiClient.get<LegacyDepartment[]>("/hr/departments/legacy"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentInput) =>
      apiClient.post<Department>("/hr/departments", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.departments() }),
  });
}

export type HrEmployeesParams = {
  page?: number;
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
  res: Employee[] | PaginatedEmployees | null | undefined,
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
  res: Employee[] | PaginatedEmployees | null | undefined,
): Employee[] {
  return normalizeEmployeesResponse(res).data;
}

export function useHrEmployees(params?: HrEmployeesParams, options?: { enabled?: boolean }) {
  const limit = params?.limit ?? 20;
  return useQuery({
    queryKey: queryKeys.hr.employees(params),
    queryFn: async (): Promise<PaginatedEmployees> => {
      const res = await apiClient.get<Employee[] | PaginatedEmployees>(
        "/hr/employees",
        params as Record<string, unknown>,
      );
      return normalizeEmployeesResponse(res, limit);
    },
    staleTime: 2 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Convenience for employee pickers (selects, assign dialogs).
 * Fetches a large page and always returns a flat Employee[].
 */
export function useHrEmployeeOptions(params?: Omit<HrEmployeesParams, "page">) {
  const merged = { limit: 100, isActive: "true" as const, ...params, page: 1 };
  const query = useHrEmployees({ ...merged, limit: Math.min(merged.limit, 100) });
  return {
    ...query,
    employees: unwrapEmployees(query.data),
  };
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...data }: UpdateProfileInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${userId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.employees() }),
  });
}

export function useHrOrgChart() {
  return useQuery({
    queryKey: queryKeys.hr.orgChart(),
    queryFn: () => apiClient.get<OrgChartNode[]>("/hr/org-chart"),
    staleTime: 2 * 60_000,
  });
}

export function useHrEmployeeStats(userId: string) {
  return useQuery({
    queryKey: queryKeys.hr.employeeStats(userId),
    queryFn: () =>
      apiClient.get<EmployeeStats>("/hr/employees/stats", { userId }),
    staleTime: 2 * 60_000,
    enabled: !!userId,
  });
}

export function useHrEmployeeProjects(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "employeeProjects", userId] as const,
    queryFn: () =>
      apiClient.get<Record<string, unknown>[]>("/hr/employees/projects", { userId }),
    staleTime: 2 * 60_000,
    enabled: !!userId,
  });
}

export function useHrEmployeeTickets(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "employeeTickets", userId] as const,
    queryFn: () =>
      apiClient.get<{ data: Record<string, unknown>[] }>("/hr/employees/tickets", { userId }),
    staleTime: 2 * 60_000,
    enabled: !!userId,
  });
}

export function useOnboardEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "employee", "onboard"],
    mutationFn: (data: OnboardEmployeeInput) =>
      apiClient.post<{ success: boolean; userId: string }>("/hr/employees/onboard", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

export function useBulkOnboardEmployees() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "employee", "onboard", "bulk"],
    mutationFn: (employees: BulkOnboardEmployeeRow[]) =>
      apiClient.post<BulkOnboardResult>("/hr/employees/onboard/bulk", { employees }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}


type AvailabilityStatus = "ON_LEAVE" | "HALF_DAY" | "AVAILABLE";

interface AvailabilityEntry {
  userId: string;
  status: AvailabilityStatus;
  leaveType?: string;
}

export function useEmployeeAvailability(userIds?: string[]) {
  const param = userIds ? userIds.join(",") : undefined;
  return useQuery({
    queryKey: [...queryKeys.hr.all, "availability", param] as const,
    queryFn: () =>
      apiClient.get<AvailabilityEntry[]>("/hr/employees/availability", param ? { userIds: param } : undefined),
    staleTime: 5 * 60_000,
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
  return useQuery({
    queryKey: [...queryKeys.hr.all, "findExpert", params] as const,
    queryFn: () => apiClient.get<ExpertResult[]>("/hr/employees/find-expert", params as unknown as Record<string, string>),
    enabled: params.skill.trim().length > 0,
    staleTime: 2 * 60_000,
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
  return useQuery({
    queryKey: [...queryKeys.hr.all, "directReports", employeeId] as const,
    queryFn: () => apiClient.get<DirectReport[]>(`/hr/employees/${employeeId}/reports-to-me`),
    enabled: !!employeeId,
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
  return useQuery({
    queryKey: [...queryKeys.hr.all, "managerScorecard", employeeId] as const,
    queryFn: () =>
      apiClient.get<ManagerScorecard>(`/hr/employees/${employeeId}/manager-scorecard`),
    enabled: !!employeeId,
    staleTime: 5 * 60_000,
  });
}

export function useEmployeeEmployment(userId: string) {
  return useQuery({
    queryKey: queryKeys.hr.employeeEmployment(userId),
    queryFn: () => apiClient.get<HrEmployment>(`/hr/employees/${userId}/employment`),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}

export function useEmployeeTimeline(employmentId: number | undefined, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.hr.employeeTimeline(employmentId ?? 0, params),
    queryFn: () => apiClient.get<HrTimelineResponse>(`/hr/employees/${employmentId}/timeline`, params as Record<string, unknown>),
    enabled: !!employmentId,
    staleTime: 2 * 60_000,
  });
}

export function useEmployeeSensitive(employmentId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.hr.employeeSensitive(employmentId ?? 0),
    queryFn: () => apiClient.get<HrSensitiveData>(`/hr/employees/${employmentId}/sensitive`),
    enabled: !!employmentId,
    staleTime: 30_000,
  });
}

export function useUpdateSensitive(employmentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "employee", "sensitive", "update", employmentId],
    mutationFn: (data: Partial<HrSensitiveData>) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${employmentId}/sensitive`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.employeeSensitive(employmentId) }),
  });
}

export function useEffectiveChanges(params?: { employmentId?: number; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.hr.effectiveChanges(params as Record<string, unknown>),
    queryFn: () => apiClient.get<{ data: HrEffectiveDatedChange[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>("/hr/effective-changes", params as Record<string, unknown>),
    enabled: !!params?.employmentId,
    staleTime: 30_000,
  });
}

export function useCreateEffectiveChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "effectiveChange", "create"],
    mutationFn: (data: { employmentId: number; changeType: string; newValue: Record<string, unknown>; effectiveFrom: string; effectiveTo?: string }) =>
      apiClient.post<HrEffectiveDatedChange>("/hr/effective-changes", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.effectiveChanges() }),
  });
}

export function useApproveEffectiveChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "effectiveChange", "approve"],
    mutationFn: (changeId: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/effective-changes/${changeId}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.effectiveChanges() }),
  });
}
