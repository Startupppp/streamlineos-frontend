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
} from "@/types/hr";

export function useHrDepartments() {
  return useQuery({
    queryKey: queryKeys.hr.departments(),
    queryFn: () => apiClient.get<Department[]>("/hr/departments"),
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
  });
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

export function useTerminateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.patch<{ success: boolean }>(`/hr/employees/${userId}`, { isActive: false }),
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
