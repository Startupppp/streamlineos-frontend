"use client";

import { Button } from "../ui/button";
import { ClockInWidgetSkeleton } from "./clock-in-widget-skeleton";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useHrAttendanceStatus,
  useHrCheckIn,
  useHrCheckOut,
} from "@/hooks/api";
import { useOrgTimeZone } from "@/hooks/api/org-display";
import { formatClockInOrgTz } from "@/lib/date-utils";
import { toast } from "sonner";
import { Clock, Loader2, Timer } from "lucide-react";

export function ClockInWidget() {
  const [now, setNow] = useState(new Date());
  const [localCooldown, setLocalCooldown] = useState(0);

  const { data: statusData, isLoading } = useHrAttendanceStatus();
  const orgTz = useOrgTimeZone();

  const checkInMutation = useHrCheckIn({
    onSuccess: () => {
      toast.success("Clocked in successfully!");
      setLocalCooldown(0);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const checkOutMutation = useHrCheckOut({
    onSuccess: () => {
      toast.success("Clocked out successfully!");
      setLocalCooldown(120);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  useEffect(() => {
    if (statusData?.cooldownRemaining && statusData.cooldownRemaining > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalCooldown(statusData.cooldownRemaining);
    }
  }, [statusData?.cooldownRemaining]);
  useEffect(() => {
    if (localCooldown > 0) {
      const timer = setTimeout(() => {
        setLocalCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [localCooldown]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isCheckedIn = statusData?.status === "PRESENT";
  const isOnBreak = statusData?.status === "ON_BREAK";
  const hasOpenSession =
    Boolean(statusData?.todayLog?.checkIn) && !statusData?.todayLog?.checkOut;
  const canClockOut = isCheckedIn || isOnBreak || hasOpenSession;
  const isInCooldown = localCooldown > 0;
  const canClockIn = !canClockOut && !isInCooldown;

  const handleToggle = useCallback(() => {
    if (canClockOut) {
      checkOutMutation.mutate();
      return;
    }
    if (canClockIn) {
      checkInMutation.mutate({});
    }
  }, [canClockIn, canClockOut, checkInMutation, checkOutMutation]);

  const isPending = checkInMutation.isPending || checkOutMutation.isPending;
  const actionEnabled = canClockIn || canClockOut;

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const sessionTime = useMemo(() => {
    if (!statusData?.todayLog?.checkIn || statusData?.todayLog?.checkOut)
      return null;
    const checkInTime = new Date(statusData.todayLog.checkIn);
    const diffMs = now.getTime() - checkInTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return { hours, minutes, seconds };
  }, [now, statusData?.todayLog]);

  const dailyStats = statusData?.dailyStats;

  if (isLoading) return <ClockInWidgetSkeleton />;

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end">
        <div className="text-muted-foreground font-bold text-sm tracking-wide">
          {orgTz !== null ? formatClockInOrgTz(now, orgTz) : "—"}
        </div>

        <div className="flex items-center gap-4 mt-1">
          {(isCheckedIn || isOnBreak) && sessionTime && (
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-mono font-bold text-primary">
                {String(sessionTime.hours).padStart(2, "0")}:
                {String(sessionTime.minutes).padStart(2, "0")}:
                {String(sessionTime.seconds).padStart(2, "0")}
              </span>
            </div>
          )}

          {dailyStats && parseFloat(dailyStats.workHours) > 0 && (
            <div className="text-xs text-muted-foreground">
              {parseFloat(dailyStats.workHours).toFixed(1)}h worked
              {parseFloat(dailyStats.breakHours) > 0 &&
                ` · ${parseFloat(dailyStats.breakHours).toFixed(1)}h break`}
            </div>
          )}
        </div>
        {!isCheckedIn && !isOnBreak && (
          <div
            className="mt-1 text-xs text-muted-foreground"
            title="Your location is recorded when you clock in."
          >
            <span className="sm:hidden">Location recorded</span>
            <span className="hidden sm:inline">
              Your location is recorded when you clock in.
            </span>
          </div>
        )}
      </div>

      <Button
        variant={actionEnabled ? "default" : "outline"}
        disabled={isPending || !actionEnabled}
        onClick={handleToggle}
        aria-label={canClockOut ? "Web clock out" : "Web clock in"}
        className={`font-bold px-3 py-2 h-auto text-xs tracking-wide rounded-sm shadow-lg ${
          actionEnabled
            ? ""
            : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isInCooldown && !canClockOut ? (
          <span className="flex items-center gap-2">
            <Timer className="h-3.5 w-3.5" />
            {formatCooldown(localCooldown)}
          </span>
        ) : canClockOut ? (
          "Clock out"
        ) : (
          "Clock in"
        )}
      </Button>
    </div>
  );
}
