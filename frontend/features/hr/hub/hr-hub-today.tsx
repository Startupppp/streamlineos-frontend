"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { HrSectionHeader } from "@/features/hr/shared/hr-ui";
import type { HrHubViewProps } from "@/hooks/api/hr/hub-types";
import { OutTodayCard } from "./today/out-today-card";
import { JoiningSoonCard } from "./today/joining-soon-card";
import { CelebrationsCard } from "./today/celebrations-card";
import { NextHolidayCard } from "./today/next-holiday-card";
import { AttendanceNowCard } from "./today/attendance-now-card";

export function HrHubToday({
  access,
  snapshot,
  isLoading,
  onRetry,
}: HrHubViewProps) {
  const sections = snapshot?.sections;
  const hasAny =
    access.canLeaveCalendar ||
    access.canAnalytics ||
    access.canAttendanceView;

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-3.5 w-56 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasAny) return null;

  return (
    <div className="space-y-2.5">
      <HrSectionHeader
        title="Today"
        description="What's happening with your people right now"
        size="lg"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {access.canLeaveCalendar && (
          <OutTodayCard
            section={sections?.leaveCalendar}
            isLoading={isLoading}
            onRetry={onRetry}
          />
        )}
        {access.canAnalytics && (
          <JoiningSoonCard
            section={sections?.onboardingStatus}
            isLoading={isLoading}
            onRetry={onRetry}
          />
        )}
        {access.canAnalytics && (
          <CelebrationsCard
            section={sections?.dashboardMetrics}
            isLoading={isLoading}
            onRetry={onRetry}
          />
        )}
        {access.canAttendanceView && (
          <NextHolidayCard
            section={sections?.holidays}
            isLoading={isLoading}
            onRetry={onRetry}
          />
        )}
        {access.canAttendanceView && (
          <AttendanceNowCard
            section={sections?.attendanceStatus}
            isLoading={isLoading}
            onRetry={onRetry}
          />
        )}
      </div>
    </div>
  );
}
