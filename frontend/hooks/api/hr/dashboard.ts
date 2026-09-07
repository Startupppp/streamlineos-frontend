"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

const hrDashboardMetricsLazy = lazyContract(() =>
  import("@/hooks/api/hr/dashboard-schema").then((m) => m.hrDashboardMetricsContract),
);
const hrLeaveCalendarLazy = lazyContract(() =>
  import("@/hooks/api/hr/dashboard-schema").then((m) => m.hrLeaveCalendarContract),
);
const hrDashboardOnboardingStatusLazy = lazyContract(() =>
  import("@/hooks/api/hr/dashboard-schema").then((m) => m.hrDashboardOnboardingStatusContract),
);

export interface HrDashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  openPositions: number;
  monthlyHires: number;
  upcomingBirthdays: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
    dateOfBirth: string | null;
    daysUntil: number;
  }[];
}

export interface HrLeaveCalendarEntry {
  id: number;
  userId: string;
  userName: string;
  userImage: string | null;
  startDate: string;
  endDate: string;
  leaveType: string;
  status: string;
}

export function useHrDashboardMetrics() {
  const canView = useCan("hr:analytics:read");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.dashboardMetrics(),
    queryFn: ({ signal }) => apiClient.get<HrDashboardMetrics>("/hr/dashboard/metrics", undefined, signal, hrDashboardMetricsLazy),
    staleTime: 60_000,
    enabled: hrEnabled && canView,
  });
}

export function useHrLeaveCalendar(month?: number, year?: number) {
  const canView = useCan("hr:leaves:read");
  const params = new URLSearchParams();
  if (month !== undefined) params.set("month", String(month));
  if (year !== undefined) params.set("year", String(year));
  const qs = params.toString();

  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.leaveCalendar(month ?? 0, year ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<HrLeaveCalendarEntry[]>(`/hr/leave-calendar${qs ? `?${qs}` : ""}`, undefined, signal, hrLeaveCalendarLazy),
    staleTime: 60_000,
    enabled: canView,
  });
}

export interface HrOnboardingStatus {
  inProgress: number;
  completed: number;
  total: number;
  completionPct: number;
  newHires: {
    userId: string;
    name: string;
    completedTasks: number;
    totalTasks: number;
    pct: number;
  }[];
}

export function useHrOnboardingStatus() {
  const canView = useCan("hr:analytics:read");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.dashboardOnboardingStatus(),
    queryFn: ({ signal }) => apiClient.get<HrOnboardingStatus>("/hr/dashboard/onboarding-status", undefined, signal, hrDashboardOnboardingStatusLazy),
    staleTime: 60_000,
    enabled: hrEnabled && canView,
  });
}
