"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import type {
  DashboardStats,
  RecentProject,
  TeamMember,
  SprintSummary,
  RecentActivity,
  MyIssue,
} from "@/types/dashboard";

export interface PublicDoc {
  id: number;
  orgId: string;
  userId: string | null;
  departmentId: number | null;
  name: string;
  description: string | null;
  type: string;
  category: string | null;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  version: number;
  parentDocumentId: number | null;
  isPublic: boolean;
  isActive: boolean;
  expiryDate: string | null;
  expiryReminderSent: boolean;
  tags: string[];
  metadata: Record<string, unknown> | null;
  uploadedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export const useDashboardStats = (
  options?: Omit<UseQueryOptions<DashboardStats, Error>, "queryKey" | "queryFn">
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  return useQuery<DashboardStats, Error>({
    queryKey: queryKeys.dashboard.stats(orgId),
    queryFn: () => apiClient.get<DashboardStats>("/dashboard/stats"),
    staleTime: 5 * 60 * 1000,
    ...options,
    enabled: !!orgId && (options?.enabled ?? true),
  });
};

export const useMyIssues = (
  options?: Omit<UseQueryOptions<MyIssue[], Error>, "queryKey" | "queryFn">
) => {
  const buildEnabled = useModuleEnabled("build");
  return useQuery<MyIssue[], Error>({
    queryKey: queryKeys.dashboard.myIssues(),
    queryFn: () => apiClient.get<MyIssue[]>("/dashboard/my-issues"),
    staleTime: 5 * 60 * 1000,
    ...options,
    enabled: buildEnabled && (options?.enabled ?? true),
  });
};

interface ScheduledActivity {
  type: string;
  subject: string | null;
}

export const useTodayActivities = (
  options?: Omit<UseQueryOptions<ScheduledActivity[], Error>, "queryKey" | "queryFn">
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canView = useCan("crm:leads:view");
  return useQuery<ScheduledActivity[], Error>({
    queryKey: [...queryKeys.dashboard.all, "todayActivities", orgId] as const,
    queryFn: () => apiClient.get<ScheduledActivity[]>("/dashboard/today-activities"),
    staleTime: 5 * 60 * 1000,
    ...options,
    enabled: !!orgId && canView && (options?.enabled ?? true),
  });
};

export const useRecentProjects = (
  options?: Omit<
    UseQueryOptions<RecentProject[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canView = useCan("build:tickets:view");
  return useQuery<RecentProject[], Error>({
    queryKey: queryKeys.dashboard.recentProjects(orgId),
    queryFn: () => apiClient.get<RecentProject[]>("/dashboard/recent-projects"),
    staleTime: 5 * 60 * 1000,
    ...options,
    enabled: !!orgId && canView && (options?.enabled ?? true),
  });
};

export const useTeamAvailability = (
  options?: Omit<UseQueryOptions<TeamMember[], Error>, "queryKey" | "queryFn">
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canView = useCan("hr:attendance:view");
  return useQuery<TeamMember[], Error>({
    queryKey: queryKeys.dashboard.teamAvailability(orgId),
    queryFn: () => apiClient.get<TeamMember[]>("/dashboard/team-availability"),
    refetchInterval: 60_000,
    staleTime: 65_000,
    refetchIntervalInBackground: false,
    ...options,
    enabled: !!orgId && canView && (options?.enabled ?? true),
  });
};

export const useActiveSprintSummary = (
  options?: Omit<
    UseQueryOptions<SprintSummary | null, Error>,
    "queryKey" | "queryFn"
  >
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const buildEnabled = useModuleEnabled("build");
  return useQuery<SprintSummary | null, Error>({
    queryKey: queryKeys.dashboard.activeSprintSummary(orgId),
    queryFn: () =>
      apiClient.get<SprintSummary | null>("/dashboard/active-sprint"),
    staleTime: 5 * 60 * 1000,
    ...options,
    enabled: !!orgId && buildEnabled && (options?.enabled ?? true),
  });
};

export const useRecentActivity = (
  options?: Omit<
    UseQueryOptions<RecentActivity[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canView = useCan("build:tickets:view");
  return useQuery<RecentActivity[], Error>({
    queryKey: queryKeys.dashboard.recentActivity(orgId),
    queryFn: () =>
      apiClient.get<RecentActivity[]>("/dashboard/recent-activity"),
    staleTime: 5 * 60 * 1000,
    ...options,
    enabled: !!orgId && canView && (options?.enabled ?? true),
  });
};

export interface LeaveToday {
  id: number;
  startDate: string;
  endDate: string;
  leaveTypeId: number | null;
  employeeName: string | null;
  employeeDesignation: string | null;
  employeeImage: string | null;
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

export interface BirthdayEntry {
  id: string;
  name: string | null;
  designation: string | null;
  image: string | null;
  type: "birthday" | "anniversary";
  date: string;
  yearsCompleted?: number;
}

interface PendingApprovalsCount {
  pendingLeaves: number;
  pendingResignations: number;
  total: number;
}

interface TeamAttendance {
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

function hrWidgetKeys(orgId: string) {
  return {
    leavesToday: [...queryKeys.dashboard.all, "leavesToday", orgId] as const,
    upcomingHolidays: [...queryKeys.dashboard.all, "upcomingHolidays", orgId] as const,
    myLeaveBalance: [...queryKeys.dashboard.all, "myLeaveBalance", orgId] as const,
    birthdays: [...queryKeys.dashboard.all, "birthdays", orgId] as const,
    pendingApprovals: [...queryKeys.dashboard.all, "pendingApprovals", orgId] as const,
    teamAttendance: [...queryKeys.dashboard.all, "teamAttendance", orgId] as const,
  };
}

export const useLeavesToday = (
  options?: Omit<UseQueryOptions<LeaveToday[], Error>, "queryKey" | "queryFn">
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canView = useCan("hr:leaves:view");
  return useQuery<LeaveToday[], Error>({
    queryKey: hrWidgetKeys(orgId).leavesToday,
    queryFn: () => apiClient.get<LeaveToday[]>("/dashboard/leaves-today"),
    staleTime: 65_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    ...options,
    enabled: !!orgId && canView && (options?.enabled ?? true),
  });
};

export const useUpcomingHolidays = () => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<UpcomingHoliday[]>({
    queryKey: hrWidgetKeys(orgId).upcomingHolidays,
    queryFn: () => apiClient.get<UpcomingHoliday[]>("/dashboard/upcoming-holidays"),
    staleTime: 5 * 60_000,
    enabled: !!orgId && hrEnabled,
  });
};

export const useMyLeaveBalance = () => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<LeaveBalance[]>({
    queryKey: hrWidgetKeys(orgId).myLeaveBalance,
    queryFn: () => apiClient.get<LeaveBalance[]>("/dashboard/my-leave-balance"),
    staleTime: 5 * 60_000,
    enabled: !!orgId && hrEnabled,
  });
};

export const useBirthdays = (
  options?: Omit<UseQueryOptions<BirthdayEntry[], Error>, "queryKey" | "queryFn">
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<BirthdayEntry[], Error>({
    queryKey: hrWidgetKeys(orgId).birthdays,
    queryFn: () => apiClient.get<BirthdayEntry[]>("/dashboard/birthdays"),
    staleTime: 5 * 60_000,
    refetchInterval: 60_000,
    ...options,
    enabled: !!orgId && hrEnabled && (options?.enabled ?? true),
  });
};

export const usePendingApprovals = (
  options?: Omit<UseQueryOptions<PendingApprovalsCount, Error>, "queryKey" | "queryFn">
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canApprove = useCan("hr:leaves:approve");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useQuery<PendingApprovalsCount, Error>({
    queryKey: hrWidgetKeys(orgId).pendingApprovals,
    queryFn: () => apiClient.get<PendingApprovalsCount>("/dashboard/pending-approvals"),
    staleTime: 65_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    ...restOptions,
    enabled: !!orgId && canApprove && (enabledOption ?? true),
  });
};

export const useTeamAttendance = () => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canView = useCan("hr:attendance:view");
  return useQuery<TeamAttendance>({
    queryKey: hrWidgetKeys(orgId).teamAttendance,
    queryFn: () => apiClient.get<TeamAttendance>("/dashboard/team-attendance"),
    staleTime: 65_000,
    refetchInterval: 60_000,
    enabled: !!orgId && canView,
  });
};

export interface Announcement {
  id: number;
  content: string;
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorFirstName: string | null;
  authorLastName: string | null;
}

interface PersonalDashboard {
  myTasks: { id: number; title: string; status: string; priority: string | null; dueDate: string | null; projectName: string | null }[];
  timesheetStatus: { submitted: boolean; weekLabel: string; hoursLogged: number };
  leaveBalance: { type: string; remaining: number; total: number }[];
  upcomingEvents: { id: number; title: string; startTime: Date; endTime: Date; type: string }[];
  unreadNotifications: number;
}

interface ExecutiveDashboard {
  mrr: number;
  pipelineValue: number;
  headcount: number;
  openRoles: number;
  newLeadsThisWeek: number;
  activeProjects: number;
  conversionRate: number;
}

export const useAnnouncements = (
  options?: Omit<UseQueryOptions<Announcement[], Error>, "queryKey" | "queryFn">
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  return useQuery<Announcement[], Error>({
    queryKey: queryKeys.dashboard.announcements(orgId),
    queryFn: () => apiClient.get<Announcement[]>("/dashboard/announcements"),
    staleTime: 60_000,
    ...options,
    enabled: !!orgId && (options?.enabled ?? true),
  });
};

export const useCreateAnnouncement = () => {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  return useMutation({
    mutationKey: ["dashboard", "announcements", "create"],
    mutationFn: (body: { title: string; content: string; isPinned?: boolean; expiresAt?: string }) =>
      apiClient.post<Announcement>("/dashboard/announcements", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.announcements(orgId) });
    },
  });
};

export const useDeleteAnnouncement = () => {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  return useMutation({
    mutationKey: ["dashboard", "announcements", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/dashboard/announcements?id=${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.announcements(orgId) });
    },
  });
};

export const usePersonalDashboard = (
  options?: Omit<UseQueryOptions<PersonalDashboard, Error>, "queryKey" | "queryFn">
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  return useQuery<PersonalDashboard, Error>({
    queryKey: queryKeys.dashboard.personal(orgId),
    queryFn: () => apiClient.get<PersonalDashboard>("/dashboard/personal"),
    staleTime: 2 * 60_000,
    ...options,
    enabled: !!orgId && (options?.enabled ?? true),
  });
};

export const useExecutiveDashboard = (
  options?: Omit<UseQueryOptions<ExecutiveDashboard, Error>, "queryKey" | "queryFn">
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canView = useCan("hr:analytics:read");
  return useQuery<ExecutiveDashboard, Error>({
    queryKey: queryKeys.dashboard.executive(orgId),
    queryFn: () => apiClient.get<ExecutiveDashboard>("/dashboard/executive"),
    staleTime: 5 * 60_000,
    ...options,
    enabled: !!orgId && canView && (options?.enabled ?? true),
  });
};

export const usePublicDocuments = (limit = 6, enabled = true) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  return useQuery<PublicDoc[]>({
    queryKey: queryKeys.dashboard.publicDocuments(orgId, limit),
    queryFn: async () => {
      const res = await apiClient.get<{ data: PublicDoc[] }>("/hr/documents", { limit });
      return res.data;
    },
    staleTime: 5 * 60_000,
    enabled: !!orgId && enabled,
  });
};
