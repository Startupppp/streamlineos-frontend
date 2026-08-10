"use client";

import { HrSectionHeader } from "@/features/hr/shared/hr-ui";
import type { HrHubAccess } from "./use-hr-hub-access";
import { OutTodayCard } from "./today/out-today-card";
import { JoiningSoonCard } from "./today/joining-soon-card";
import { InterviewsTodayCard } from "./today/interviews-today-card";
import { CelebrationsCard } from "./today/celebrations-card";
import { NextHolidayCard } from "./today/next-holiday-card";
import { AttendanceNowCard } from "./today/attendance-now-card";

interface HrHubTodayProps {
  access: HrHubAccess;
}

export function HrHubToday({ access }: HrHubTodayProps) {
  const hasAny =
    access.canLeaves ||
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
        {access.canLeaves && <OutTodayCard />}
        {access.canAnalytics && <JoiningSoonCard />}
        {access.canInterviews && (
          <InterviewsTodayCard enabled={access.canInterviews} />
        )}
        {access.canAnalytics && <CelebrationsCard />}
        {access.canAttendanceView && <NextHolidayCard />}
        {access.canAttendanceView && <AttendanceNowCard />}
      </div>
    </div>
  );
}
