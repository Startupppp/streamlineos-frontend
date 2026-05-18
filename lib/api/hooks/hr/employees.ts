"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
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
} from "@/types/hr";
import type { TerminatedEmployee } from "@/types/hr/employees";

export function useHrDepartments() {
  return useQuery({
    queryKey: queryKeys.hr.departments(),
    queryFn: () => apiClient.get<Department[]>("/hr/departments"),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentInput) =>
      apiClient.post<{ success: boolean }>("/hr/departments", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.departments() }),
  });
}

export function useHrEmployees(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.hr.employees(params),
    queryFn: () =>
      apiClient.get<Employee[] | PaginatedEmployees>("/hr/employees", params as Record<string, unknown>),
  });
}

export function useTerminatedEmployees() {
  return useQuery({
    queryKey: queryKeys.hr.terminatedEmployees(),
    queryFn: () => apiClient.get<TerminatedEmployee[]>("/hr/employees/terminated"),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...data }: UpdateProfileInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${userId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}

export function useTerminateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${userId}`, { isActive: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.all });
      qc.invalidateQueries({ queryKey: queryKeys.hr.terminatedEmployees() });
    },
  });
}

export function useToggleDashboardAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, hasDashboardAccess }: { userId: string; hasDashboardAccess: boolean }) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${userId}`, { hasDashboardAccess }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.employees() }),
  });
}

export function useHrOrgChart() {
  return useQuery({
    queryKey: queryKeys.hr.orgChart(),
    queryFn: () => apiClient.get<OrgChartNode[]>("/hr/org-chart"),
  });
}

export function useHrEmployeeStats(userId: string) {
  return useQuery({
    queryKey: queryKeys.hr.employeeStats(userId),
    queryFn: () =>
      apiClient.get<EmployeeStats>("/hr/employees/stats", { userId }),
    enabled: !!userId,
  });
}

export function useHrEmployeeProjects(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "employeeProjects", userId] as const,
    queryFn: () =>
      apiClient.get<Record<string, unknown>[]>("/hr/employees/projects", { userId }),
    enabled: !!userId,
  });
}

export function useHrEmployeeTickets(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "employeeTickets", userId] as const,
    queryFn: () =>
      apiClient.get<{ data: Record<string, unknown>[] }>("/hr/employees/tickets", { userId }),
    enabled: !!userId,
  });
}

export function useOnboardEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OnboardEmployeeInput) =>
      apiClient.post<{ success: boolean }>("/hr/employees/onboard", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.all }),
  });
}


export type AvailabilityStatus = "ON_LEAVE" | "HALF_DAY" | "AVAILABLE";

export interface AvailabilityEntry {
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
  skills: string[];
  matchedSkill: string;
}

export function useFindExpert(skill: string) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "findExpert", skill] as const,
    queryFn: () => apiClient.get<ExpertResult[]>("/hr/employees/find-expert", { skill }),
    enabled: skill.trim().length > 0,
    staleTime: 2 * 60_000,
  });
}


export interface DirectReport {
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


export interface ManagerScorecard {
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
