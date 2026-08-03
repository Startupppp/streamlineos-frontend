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

export function AttendanceContent({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
      <div className="overscroll-contain flex flex-col gap-4 min-w-0 min-h-full flex-1">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">
        <div className="space-y-4">
          <TimerCard />
          <WfhBalancesCard />
          <AttendanceRegularizationDialog />
          {isAdmin && <TeamAttendanceCard />}
        </div>

        <div className="space-y-4">
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
