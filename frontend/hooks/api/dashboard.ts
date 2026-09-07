"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const dashboardStatsContract = lazyContract(() =>
  import("@/hooks/api/dashboard-schema").then((m) => m.dashboardStatsContract),
);
const todayActivitiesContract = lazyContract(() =>
  import("@/hooks/api/dashboard-schema").then((m) => m.todayActivitiesContract),
);
const leavesTodayContract = lazyContract(() =>
  import("@/hooks/api/dashboard-schema").then((m) => m.leavesTodayContract),
);
const upcomingHolidaysContract = lazyContract(() =>
  import("@/hooks/api/dashboard-schema").then((m) => m.upcomingHolidaysContract),
);
const birthdaysContract = lazyContract(() =>
  import("@/hooks/api/dashboard-schema").then((m) => m.birthdaysContract),
);
const pendingApprovalsContract = lazyContract(() =>
  import("@/hooks/api/dashboard-schema").then((m) => m.pendingApprovalsContract),
);
const announcementsListContract = lazyContract(() =>
  import("@/hooks/api/dashboard-schema").then((m) => m.announcementsListContract),
);
const dashboardSuccessContract = lazyContract(() =>
  import("@/hooks/api/dashboard-schema").then((m) => m.dashboardSuccessContract),
);
const executiveDashboardContract = lazyContract(() =>
  import("@/hooks/api/dashboard-schema").then((m) => m.executiveDashboardContract),
);
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { homeSectionModule } from "@/lib/home/home-sections";
import type {
  DashboardStats,
  RecentProject,
  SprintSummary,
  RecentActivity,
  MyIssue,
} from "@/types/dashboard";
import {
  DAILY_DATA_STALE_TIME_MS,
  NOTIFICATION_FALLBACK_INTERVAL_MS,
} from "@/lib/query-request-policies";

export interface PublicDoc {
  id: number;
  orgId: string;
  userId: string | null;
  departmentId: string | null;
  name: string;
  description: string | null;
  type: string;
  category: string | null;
  hasFile: boolean;
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
    queryKey: collaborationQueryKeys.dashboard.stats(),
    queryFn: ({ signal }) => apiClient.get<DashboardStats>("/dashboard/stats", undefined, signal, dashboardStatsContract),
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
    queryKey: collaborationQueryKeys.dashboard.myIssues(),
    queryFn: ({ signal }) => apiClient.get<MyIssue[]>("/dashboard/my-issues", undefined, signal),
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
    queryKey: collaborationQueryKeys.dashboard.todayActivities(),
    queryFn: ({ signal }) => apiClient.get<ScheduledActivity[]>("/dashboard/today-activities", undefined, signal, todayActivitiesContract),
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
    queryKey: collaborationQueryKeys.dashboard.recentProjects(),
    queryFn: ({ signal }) => apiClient.get<RecentProject[]>("/dashboard/recent-projects", undefined, signal),
    staleTime: 5 * 60 * 1000,
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
    queryKey: collaborationQueryKeys.dashboard.activeSprintSummary(),
    queryFn: ({ signal }) =>
      apiClient.get<SprintSummary | null>("/dashboard/active-sprint", undefined, signal),
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
    queryKey: collaborationQueryKeys.dashboard.recentActivity(),
    queryFn: ({ signal }) =>
      apiClient.get<RecentActivity[]>("/dashboard/recent-activity", undefined, signal),
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
  hasMore: boolean;
}

export interface LeavesTodayPage {
  data: LeaveToday[];
  total: number;
  hasMore: boolean;
}

export const useLeavesToday = (
  options?: Omit<UseQueryOptions<LeavesTodayPage, Error>, "queryKey" | "queryFn">
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canView = useCan("hr:leaves:view");
  return useQuery<LeavesTodayPage, Error>({
    queryKey: collaborationQueryKeys.dashboard.leavesToday(),
    queryFn: ({ signal }) => apiClient.get<LeavesTodayPage>("/dashboard/leaves-today", undefined, signal, leavesTodayContract),
    staleTime: 2 * 60_000,
    ...options,
    enabled: !!orgId && canView && (options?.enabled ?? true),
  });
};

export const useUpcomingHolidays = () => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<UpcomingHoliday[]>({
    queryKey: collaborationQueryKeys.dashboard.upcomingHolidays(),
    queryFn: ({ signal }) => apiClient.get<UpcomingHoliday[]>("/dashboard/upcoming-holidays", undefined, signal, upcomingHolidaysContract),
    staleTime: DAILY_DATA_STALE_TIME_MS,
    enabled: !!orgId && hrEnabled,
  });
};

export const useMyLeaveBalance = () => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<LeaveBalance[]>({
    queryKey: collaborationQueryKeys.dashboard.myLeaveBalance(),
    queryFn: ({ signal }) => apiClient.get<LeaveBalance[]>("/dashboard/my-leave-balance", undefined, signal),
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
    queryKey: collaborationQueryKeys.dashboard.birthdays(),
    queryFn: ({ signal }) => apiClient.get<BirthdayEntry[]>("/dashboard/birthdays", undefined, signal, birthdaysContract),
    staleTime: DAILY_DATA_STALE_TIME_MS,
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
    queryKey: collaborationQueryKeys.dashboard.pendingApprovals(),
    queryFn: ({ signal }) => apiClient.get<PendingApprovalsCount>("/dashboard/pending-approvals", undefined, signal, pendingApprovalsContract),
    staleTime: NOTIFICATION_FALLBACK_INTERVAL_MS,
    refetchInterval: NOTIFICATION_FALLBACK_INTERVAL_MS,
    refetchIntervalInBackground: false,
    ...restOptions,
    enabled: !!orgId && canApprove && (enabledOption ?? true),
  });
};

export const useTeamAttendance = (
  options?: Omit<UseQueryOptions<TeamAttendance, Error>, "queryKey" | "queryFn">
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canView = useCan("hr:attendance:view");
  return useQuery<TeamAttendance>({
    queryKey: collaborationQueryKeys.dashboard.teamAttendance(),
    queryFn: ({ signal }) => apiClient.get<TeamAttendance>("/dashboard/team-attendance", undefined, signal),
    staleTime: 65_000,
    ...options,
    enabled: !!orgId && canView && (options?.enabled ?? true),
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

/**
 * `leaveBalance` and `unreadNotifications` used to be here and are gone.
 *
 * Neither was ever read: they appeared exactly once each in this repository —
 * on this interface — while `usePersonalDashboard`'s three consumers
 * (my-tasks-widget, timesheet-widget, upcoming-events-widget) read `myTasks`,
 * `timesheetStatus` and `upcomingEvents`. The leave balance Home renders comes
 * from `useMyLeaveBalance` -> GET /dashboard/my-leave-balance, a different
 * route. The backend no longer computes either; the unread count was the most
 * expensive query on the Home surface.
 */
interface PersonalDashboard {
  myTasks: { id: number; title: string; status: string; priority: string | null; dueDate: string | null; projectName: string | null }[];
  timesheetStatus: { submitted: boolean; weekLabel: string; hoursLogged: number };
  upcomingEvents: { id: number; title: string; startTime: Date; endTime: Date; type: string }[];
  degraded?: string[];
}

interface ExecutiveDashboard {
  headcount: number;
  openRoles: number;
  activeProjects: number;
  mrr?: number;
  pipelineValue?: number;
  newLeadsThisWeek?: number;
  conversionRate?: number;
}

export const useAnnouncements = (
  options?: Omit<UseQueryOptions<Announcement[], Error>, "queryKey" | "queryFn">
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  return useQuery<Announcement[], Error>({
    queryKey: collaborationQueryKeys.dashboard.announcements(),
    queryFn: ({ signal }) => apiClient.get<Announcement[]>("/dashboard/announcements", undefined, signal, announcementsListContract),
    staleTime: 60_000,
    ...options,
    enabled: !!orgId && (options?.enabled ?? true),
  });
};

export const useCreateAnnouncement = () => {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:manage", {
    mutationKey: ["dashboard", "announcements", "create"],
    mutationFn: (body: { title: string; content: string; isPinned?: boolean; expiresAt?: string }) =>
      apiClient.post<Announcement>("/dashboard/announcements", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: collaborationQueryKeys.dashboard.announcements() });
    },
  });
};

export const useDeleteAnnouncement = () => {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:manage", {
    mutationKey: ["dashboard", "announcements", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/dashboard/announcements?id=${id}`, undefined, undefined, dashboardSuccessContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: collaborationQueryKeys.dashboard.announcements() });
    },
  });
};

export const usePersonalDashboard = (
  options?: Omit<UseQueryOptions<PersonalDashboard, Error>, "queryKey" | "queryFn">
) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  return useQuery<PersonalDashboard, Error>({
    queryKey: collaborationQueryKeys.dashboard.personal(),
    queryFn: ({ signal }) => apiClient.get<PersonalDashboard>("/dashboard/personal", undefined, signal),
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
    queryKey: collaborationQueryKeys.dashboard.executive(),
    queryFn: ({ signal }) => apiClient.get<ExecutiveDashboard>("/dashboard/executive", undefined, signal, executiveDashboardContract),
    staleTime: 5 * 60_000,
    ...options,
    enabled: !!orgId && canView && (options?.enabled ?? true),
  });
};

export const usePublicDocuments = (limit = 6, enabled = true) => {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const hrEnabled = useModuleEnabled(homeSectionModule("public-documents") ?? "hr");
  const canView = useCan("hr:documents:view");
  return useQuery<PublicDoc[]>({
    queryKey: collaborationQueryKeys.dashboard.publicDocuments(limit),
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{ data: PublicDoc[] }>("/hr/documents", { limit }, signal);
      return res.data;
    },
    staleTime: 5 * 60_000,
    enabled: !!orgId && hrEnabled && canView && enabled,
  });
};
