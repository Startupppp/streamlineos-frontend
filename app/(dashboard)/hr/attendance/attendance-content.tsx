"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { TimerCard } from "@/features/hr/attendance/check-in-button";
import { WfhBalancesCard } from "@/features/hr/attendance/wfh-balances-card";
import { AttendanceCalendar } from "@/features/hr/attendance/attendance-calendar";
import { AttendanceHeatmap } from "@/features/hr/attendance/attendance-heatmap";
import { ManageHolidaysCard } from "@/features/hr/attendance/manage-holidays-card";
import { DailyHistoryTable } from "@/features/hr/attendance/daily-history-table";

export function AttendanceContent({ userId, isAdmin = false }: { userId: string; isAdmin?: boolean }) {
  return (

    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden">

      <ScrollArea className="shrink-0 lg:w-80 xl:w-96">
        <div className="space-y-5 pr-3 pb-6">
          <TimerCard />
          <WfhBalancesCard />
        </div>
      </ScrollArea>

      <ScrollArea className="flex-1 min-w-0">
        <div className="space-y-5 pr-3 pb-6">
          <AttendanceCalendar userId={userId} />
          <AttendanceHeatmap userId={userId} />
          {isAdmin && <ManageHolidaysCard />}
          <DailyHistoryTable />
        </div>
      </ScrollArea>

    </div>
  );
}
