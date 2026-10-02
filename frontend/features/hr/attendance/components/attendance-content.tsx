"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimerCard } from "@/features/hr/attendance/check-in-button";
import { DailyHistoryTable } from "@/features/hr/attendance/daily-history-table";
import { TeamAttendanceCard } from "@/features/hr/attendance/team-attendance-card";
import { AttendanceRegularizationDialog } from "@/features/hr/attendance/attendance-regularization-dialog";
import { RegularizationQueueCard } from "@/features/hr/attendance/regularization-queue-card";

const WFH_REQUEST_HREF = "/me/time-off?tab=wfh&wfh=1";

interface AttendanceContentProps {
  isAdmin?: boolean;
}

export function AttendanceContent({ isAdmin = false }: AttendanceContentProps) {
  const router = useRouter();
  const handleRequestWfh = useCallback(() => {
    router.push(WFH_REQUEST_HREF);
  }, [router]);

  return (
    <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
      <div className="flex min-h-full min-w-0 flex-1 flex-col gap-3 overscroll-contain">
        <div
          className={
            isAdmin
              ? "grid grid-cols-1 gap-3 lg:grid-cols-2"
              : "mx-auto w-full max-w-md"
          }
        >
          <div className="space-y-3">
            <TimerCard onRequestWfh={handleRequestWfh} />
            <AttendanceRegularizationDialog />
          </div>
          {isAdmin ? (
            <div className="space-y-3">
              <TeamAttendanceCard />
            </div>
          ) : null}
        </div>
        {isAdmin ? <RegularizationQueueCard /> : null}
        <DailyHistoryTable />
      </div>
    </ScrollArea>
  );
}
