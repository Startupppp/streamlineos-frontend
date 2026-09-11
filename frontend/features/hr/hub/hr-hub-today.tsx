"use client";

import { HrSectionHeader } from "@/features/hr/shared/hr-ui";
import type { HrHubViewProps } from "@/hooks/api/hr/hub-types";
import { OutTodayCard } from "./today/out-today-card";
import { JoiningSoonCard } from "./today/joining-soon-card";
import { InterviewsTodayCard } from "./today/interviews-today-card";
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
    access.canInterviews ||
    access.canAttendanceView;

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
        {access.canInterviews && (
          <InterviewsTodayCard
            section={sections?.interviews}
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
