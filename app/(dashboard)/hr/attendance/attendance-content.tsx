"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { TimerCard } from "@/features/hr/attendance/check-in-button";
import { WfhBalancesCard } from "@/features/hr/attendance/wfh-balances-card";
import { AttendanceCalendar } from "@/features/hr/attendance/attendance-calendar";
import { ManageHolidaysCard } from "@/features/hr/attendance/manage-holidays-card";
import { DailyHistoryTable } from "@/features/hr/attendance/daily-history-table";

export function AttendanceContent({ userId, isAdmin = false }: { userId: string; isAdmin?: boolean }) {
  return (
    // On mobile: flex-col + overflow-y-auto → single unified scroll
    // On desktop (lg): flex-row + overflow-hidden → two independent ScrollAreas
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden">

      {/* Left column — fixed width on desktop */}
      <ScrollArea className="shrink-0 lg:w-80 xl:w-96">
        <div className="space-y-5 pr-3 pb-6">
          <TimerCard />
          <WfhBalancesCard />
        </div>
      </ScrollArea>

      {/* Right column — fills remaining width */}
      <ScrollArea className="flex-1 min-w-0">
        <div className="space-y-5 pr-3 pb-6">
          <AttendanceCalendar userId={userId} />
          {isAdmin && <ManageHolidaysCard />}
          <DailyHistoryTable />
        </div>
      </ScrollArea>

    </div>
  );
}
