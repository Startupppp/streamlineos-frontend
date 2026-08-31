"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { AlertTriangle, Clock } from "lucide-react";
import { WidgetCard } from "@/components/ui/widget-card";
import { useHrAttendanceStatus } from "@/hooks/api/hr";
import { AttendanceRegularizationDialog } from "@/features/hr/attendance/attendance-regularization-dialog";

const STATUS_LABEL: Record<string, string> = {
  OFFLINE: "Not clocked in",
  PRESENT: "Present",
  ON_BREAK: "On break",
  CHECKED_OUT: "Checked out",
};

const STATUS_TONE: Record<string, string> = {
  OFFLINE: "text-muted-foreground",
  PRESENT: "text-status-success-ink",
  ON_BREAK: "text-status-warning-ink",
  CHECKED_OUT: "text-primary",
};

const MISSING_PUNCH_HOUR_CUTOFF = 11;

export function MyAttendanceWidget() {
  const { data, isLoading, error, refetch } = useHrAttendanceStatus();
  const handleRetry = () => void refetch();

  const missingPunchWarning = useMemo(() => {
    if (!data) return null;
    const today = format(new Date(), "yyyy-MM-dd");
    const missedCheckout = data.logs.find(
      (log) => log.date !== today && log.checkIn && !log.checkOut,
    );
    if (missedCheckout) {
      return `Forgot to check out on ${format(new Date(missedCheckout.date), "MMM d")}`;
    }
    if (data.status === "OFFLINE" && new Date().getHours() >= MISSING_PUNCH_HOUR_CUTOFF) {
      return "You haven't clocked in today";
    }
    return null;
  }, [data]);

  return (
    <WidgetCard
      icon={Clock}
      iconClassName="text-primary"
      title="My Attendance"
      badge={
        data ? (
          <span className={STATUS_TONE[data.status]}>{STATUS_LABEL[data.status]}</span>
        ) : undefined
      }
      isLoading={isLoading}
      error={error}
      onRetry={handleRetry}
      loadingRows={2}
      isEmpty={!data}
      empty={
        <p className="text-xs text-muted-foreground text-center py-6">No data.</p>
      }
    >
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/60 p-2.5">
            <p className="text-micro text-muted-foreground">Worked today</p>
            <p className="text-lg font-bold tabular-nums mt-0.5">
              {data?.dailyStats.workHours ?? "0"}h
            </p>
          </div>
          <div className="rounded-lg border border-border/60 p-2.5">
            <p className="text-micro text-muted-foreground">Break time</p>
            <p className="text-lg font-bold tabular-nums mt-0.5">
              {data?.dailyStats.breakHours ?? "0"}h
            </p>
          </div>
        </div>
        {missingPunchWarning && (
          <div className="flex items-start gap-1.5 rounded-lg border border-status-warning-rule bg-status-warning-surface p-2 text-dense text-status-warning-ink">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{missingPunchWarning}</span>
          </div>
        )}
        <AttendanceRegularizationDialog />
      </div>
    </WidgetCard>
  );
}
