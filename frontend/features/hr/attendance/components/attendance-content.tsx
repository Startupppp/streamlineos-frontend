"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { TimerCard } from "@/features/hr/attendance/check-in-button";
import { WfhBalancesCard } from "@/features/hr/attendance/wfh-balances-card";
import { AttendanceCalendar } from "@/features/hr/attendance/attendance-calendar";
import { AttendanceHeatmap } from "@/features/hr/attendance/attendance-heatmap";
import { ManageHolidaysCard } from "@/features/hr/attendance/manage-holidays-card";
import { DailyHistoryTable } from "@/features/hr/attendance/daily-history-table";
import { TeamAttendanceCard } from "@/features/hr/attendance/team-attendance-card";
import { AttendanceRegularizationDialog } from "@/features/hr/attendance/attendance-regularization-dialog";

interface AttendanceContentProps {
  isAdmin?: boolean;
  selfService?: boolean;
}

export function AttendanceContent({
  isAdmin = false,
  selfService = false,
}: AttendanceContentProps) {
  return (
    <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
      <div className="flex min-h-full min-w-0 flex-1 flex-col gap-3 overscroll-contain">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="space-y-3">
            <TimerCard />
            {!selfService && <WfhBalancesCard />}
            <AttendanceRegularizationDialog />
            {isAdmin && <TeamAttendanceCard />}
          </div>

          <div className="space-y-3">
            <AttendanceCalendar />
            <AttendanceHeatmap />
            {isAdmin && <ManageHolidaysCard />}
          </div>
        </div>

        <DailyHistoryTable />
      </div>
    </ScrollArea>
  );
}
