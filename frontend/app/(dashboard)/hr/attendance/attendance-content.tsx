"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { TimerCard } from "@/features/hr/attendance/check-in-button";
import { WfhBalancesCard } from "@/features/hr/attendance/wfh-balances-card";
import { AttendanceCalendar } from "@/features/hr/attendance/attendance-calendar";
import { AttendanceHeatmap } from "@/features/hr/attendance/attendance-heatmap";
import { ManageHolidaysCard } from "@/features/hr/attendance/manage-holidays-card";
import { DailyHistoryTable } from "@/features/hr/attendance/daily-history-table";
import { TeamAttendanceCard } from "@/features/hr/attendance/team-attendance-card";

export function AttendanceContent({ userId, isAdmin = false }: { userId: string; isAdmin?: boolean }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto min-w-0">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">
        <div className="space-y-4">
          <TimerCard />
          <WfhBalancesCard />
          {isAdmin && <TeamAttendanceCard />}
        </div>

        <div className="space-y-4">
          <AttendanceCalendar userId={userId} />
          <AttendanceHeatmap userId={userId} />
          {isAdmin && <ManageHolidaysCard />}
        </div>
      </div>

      <DailyHistoryTable />
    </div>
  );
}
