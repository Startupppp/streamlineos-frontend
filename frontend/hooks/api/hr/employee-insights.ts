"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import type { EmployeeStats } from "@/types/hr";

type AvailabilityStatus = "ON_LEAVE" | "HALF_DAY" | "AVAILABLE";

interface AvailabilityEntry {
  userId: string;
  status: AvailabilityStatus;
  leaveType?: string;
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

interface DirectReport {
  id: string;
  name: string | null;
  image: string | null;
  designation: string | null;
  email: string;
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

export function useHrEmployeeStats(userId: string) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.employeeStats(userId),
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
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "employeeProjects",
      userId,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<Record<string, unknown>[]>(
        "/hr/employees/projects",
        { userId },
        signal,
      ),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && !!userId && canView,
  });
}

export function useHrEmployeeTickets(userId: string) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "employeeTickets",
      userId,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<{ data: Record<string, unknown>[] }>(
        "/hr/employees/tickets",
        { userId },
        signal,
      ),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && !!userId && canView,
  });
}

export function useEmployeeAvailability(userIds?: string[]) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  const param = userIds ? userIds.join(",") : undefined;
  return useQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "availability",
      param,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<AvailabilityEntry[]>(
        "/hr/employees/availability",
        param ? { userIds: param } : undefined,
        signal,
      ),
    staleTime: 5 * 60_000,
    enabled: hrEnabled && canView,
  });
}

export function useFindExpert(params: FindExpertParams) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "findExpert",
      params,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<ExpertResult[]>(
        "/hr/employees/find-expert",
        params as unknown as Record<string, string>,
        signal,
      ),
    enabled: hrEnabled && canView && params.skill.trim().length > 0,
    staleTime: 2 * 60_000,
  });
}

export function useSkillsMatrix(params: SkillsMatrixParams = {}) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  const { cursor, limit = 20, enabled = true } = params;
  const requestParams = { cursor, limit };
  return useQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "skillsMatrix",
      requestParams,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<SkillsMatrixData>(
        "/hr/employees/skills-matrix",
        requestParams,
        signal,
      ),
    staleTime: 60_000,
    enabled: hrEnabled && canView && enabled,
  });
}

export function useDirectReports(employeeId: string) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "directReports",
      employeeId,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<DirectReport[]>(
        `/hr/employees/${employeeId}/reports-to-me`,
        undefined,
        signal,
      ),
    enabled: hrEnabled && !!employeeId && canView,
    staleTime: 5 * 60_000,
  });
}

export function useManagerScorecard(employeeId: string) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.all,
      "managerScorecard",
      employeeId,
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get<ManagerScorecard>(
        `/hr/employees/${employeeId}/manager-scorecard`,
        undefined,
        signal,
      ),
    enabled: hrEnabled && !!employeeId && canView,
    staleTime: 5 * 60_000,
  });
}
