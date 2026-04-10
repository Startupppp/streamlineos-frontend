"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  DashboardStats,
  RecentProject,
  TeamMember,
  SprintSummary,
  RecentActivity,
  MyIssue,
} from "@/types/dashboard";

export const useHrDashboardStats = (
  options?: Omit<UseQueryOptions<DashboardStats, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<DashboardStats, Error>({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => apiClient.get<DashboardStats>("/dashboard/stats"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useDashboardStats = (
  options?: Omit<UseQueryOptions<DashboardStats, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<DashboardStats, Error>({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => apiClient.get<DashboardStats>("/dashboard/stats"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useMyIssues = (
  userId: string,
  options?: Omit<UseQueryOptions<MyIssue[], Error>, "queryKey" | "queryFn" | "enabled">
) => {
  return useQuery<MyIssue[], Error>({
    queryKey: queryKeys.dashboard.myIssues(userId),
    queryFn: () =>
      apiClient.get<MyIssue[]>("/dashboard/my-issues", { userId, limit: "20" }),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useRoleStats = (
  options?: Omit<UseQueryOptions<Record<string, number>, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<Record<string, number>, Error>({
    queryKey: [...queryKeys.dashboard.all, "roleStats"] as const,
    queryFn: () => apiClient.get<Record<string, number>>("/dashboard/role-stats"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

interface ScheduledActivity {
  type: string;
  subject: string | null;
}

export const useTodayActivities = (
  options?: Omit<UseQueryOptions<ScheduledActivity[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<ScheduledActivity[], Error>({
    queryKey: [...queryKeys.dashboard.all, "todayActivities"] as const,
    queryFn: () => apiClient.get<ScheduledActivity[]>("/dashboard/today-activities"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useRecentProjects = (
  options?: Omit<
    UseQueryOptions<RecentProject[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<RecentProject[], Error>({
    queryKey: queryKeys.dashboard.recentProjects(),
    queryFn: () => apiClient.get<RecentProject[]>("/dashboard/recent-projects"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useTeamAvailability = (
  options?: Omit<UseQueryOptions<TeamMember[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<TeamMember[], Error>({
    queryKey: queryKeys.dashboard.teamAvailability(),
    queryFn: () => apiClient.get<TeamMember[]>("/dashboard/team-availability"),
    refetchInterval: 30_000,
    staleTime: 15_000,
    ...options,
  });
};

export const useActiveSprintSummary = (
  options?: Omit<
    UseQueryOptions<SprintSummary | null, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<SprintSummary | null, Error>({
    queryKey: queryKeys.dashboard.activeSprintSummary(),
    queryFn: () =>
      apiClient.get<SprintSummary | null>("/dashboard/active-sprint"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useRecentActivity = (
  options?: Omit<
    UseQueryOptions<RecentActivity[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<RecentActivity[], Error>({
    queryKey: queryKeys.dashboard.recentActivity(),
    queryFn: () =>
      apiClient.get<RecentActivity[]>("/dashboard/recent-activity"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export interface LeaveToday {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  leaveType: string | null;
  userName: string | null;
  userImage: string | null;
  userDesignation: string | null;
  userDepartment: string | null;
}

export interface UpcomingLeave {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  leaveType: string | null;
  userName: string | null;
  userImage: string | null;
  userDesignation: string | null;
}

export interface UpcomingHoliday {
  id: number;
  name: string;
  date: string;
  message: string | null;
}

export interface LeaveBalance {
  id: number;
  balance: string;
  year: number;
  leaveTypeName: string | null;
  daysPerYear: number | null;
}

export interface PendingRequest {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string | null;
  leaveType: string | null;
  createdAt: string | null;
}

export interface BirthdayEntry {
  id: string;
  name: string | null;
  image: string | null;
  designation: string | null;
  dateOfBirth: string | null;
  joiningDate: string | null;
  isBirthday: boolean;
  isAnniversary: boolean;
  yearsOfService: number;
}

export interface PendingApprovals {
  pendingLeaves: number;
  pendingResignations: number;
  total: number;
}

export interface TeamAttendance {
  total: number;
  present: number;
  clockedIn: number;
  absent: number;
  records: {
    userId: string;
    userName: string | null;
    userImage: string | null;
    userDesignation: string | null;
    checkIn: string | null;
    checkOut: string | null;
    status: string | null;
  }[];
}

const hrWidgetKeys = {
  leavesToday: [...queryKeys.dashboard.all, "leavesToday"] as const,
  upcomingLeaves: [...queryKeys.dashboard.all, "upcomingLeaves"] as const,
  upcomingHolidays: [...queryKeys.dashboard.all, "upcomingHolidays"] as const,
  myLeaveBalance: [...queryKeys.dashboard.all, "myLeaveBalance"] as const,
  pendingRequests: [...queryKeys.dashboard.all, "pendingRequests"] as const,
  birthdays: [...queryKeys.dashboard.all, "birthdays"] as const,
  pendingApprovals: [...queryKeys.dashboard.all, "pendingApprovals"] as const,
  teamAttendance: [...queryKeys.dashboard.all, "teamAttendance"] as const,
};

export const useLeavesToday = () =>
  useQuery<LeaveToday[]>({
    queryKey: hrWidgetKeys.leavesToday,
    queryFn: () => apiClient.get<LeaveToday[]>("/dashboard/leaves-today"),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

export const useUpcomingLeaves = () =>
  useQuery<UpcomingLeave[]>({
    queryKey: hrWidgetKeys.upcomingLeaves,
    queryFn: () => apiClient.get<UpcomingLeave[]>("/dashboard/upcoming-leaves"),
    staleTime: 60_000,
  });

export const useUpcomingHolidays = () =>
  useQuery<UpcomingHoliday[]>({
    queryKey: hrWidgetKeys.upcomingHolidays,
    queryFn: () => apiClient.get<UpcomingHoliday[]>("/dashboard/upcoming-holidays"),
    staleTime: 5 * 60_000,
  });

export const useMyLeaveBalance = () =>
  useQuery<LeaveBalance[]>({
    queryKey: hrWidgetKeys.myLeaveBalance,
    queryFn: () => apiClient.get<LeaveBalance[]>("/dashboard/my-leave-balance"),
    staleTime: 5 * 60_000,
  });

export const usePendingRequests = () =>
  useQuery<PendingRequest[]>({
    queryKey: hrWidgetKeys.pendingRequests,
    queryFn: () => apiClient.get<PendingRequest[]>("/dashboard/pending-requests"),
    staleTime: 60_000,
  });

export const useBirthdays = () =>
  useQuery<BirthdayEntry[]>({
    queryKey: hrWidgetKeys.birthdays,
    queryFn: () => apiClient.get<BirthdayEntry[]>("/dashboard/birthdays"),
    staleTime: 5 * 60_000,
  });

export const usePendingApprovals = () =>
  useQuery<PendingApprovals>({
    queryKey: hrWidgetKeys.pendingApprovals,
    queryFn: () => apiClient.get<PendingApprovals>("/dashboard/pending-approvals"),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

export const useTeamAttendance = () =>
  useQuery<TeamAttendance>({
    queryKey: hrWidgetKeys.teamAttendance,
    queryFn: () => apiClient.get<TeamAttendance>("/dashboard/team-attendance"),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
