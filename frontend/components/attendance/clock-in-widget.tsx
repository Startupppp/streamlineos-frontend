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
import { formatClockInParts } from "@/lib/date-utils";
import { toast } from "sonner";
import { Clock, Loader2, MapPin, Timer } from "lucide-react";

const LOCATION_HINT = "Your location is recorded when you clock in.";

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
  const clockParts = useMemo(
    () => formatClockInParts(now, orgTz),
    [now, orgTz],
  );

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
  const showSessionMeta =
    (isCheckedIn || isOnBreak) && Boolean(sessionTime);
  const showDailyStats =
    Boolean(dailyStats) && parseFloat(dailyStats?.workHours ?? "0") > 0;

  if (isLoading) return <ClockInWidgetSkeleton />;

  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:justify-end">
      <div className="min-w-0 flex-1 sm:flex-none sm:text-right">
        <div className="flex min-w-0 items-baseline gap-1.5 sm:justify-end">
          <span className="shrink-0 text-sm font-semibold tabular-nums tracking-tight text-foreground">
            {clockParts?.time ?? "—"}
          </span>
          {clockParts ? (
            <span className="hidden truncate text-xs text-muted-foreground tabular-nums sm:inline">
              {clockParts.date}
            </span>
          ) : null}
        </div>

        {showSessionMeta || showDailyStats ? (
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:justify-end">
            {showSessionMeta && sessionTime ? (
              <span className="inline-flex items-center gap-1 font-mono font-medium text-primary tabular-nums">
                <Clock className="size-3 shrink-0" aria-hidden />
                {String(sessionTime.hours).padStart(2, "0")}:
                {String(sessionTime.minutes).padStart(2, "0")}:
                {String(sessionTime.seconds).padStart(2, "0")}
              </span>
            ) : null}
            {showDailyStats && dailyStats ? (
              <span className="text-muted-foreground">
                {parseFloat(dailyStats.workHours).toFixed(1)}h
                {parseFloat(dailyStats.breakHours) > 0
                  ? ` · ${parseFloat(dailyStats.breakHours).toFixed(1)}h break`
                  : ""}
              </span>
            ) : null}
          </div>
        ) : !canClockOut ? (
          <p className="mt-0.5 hidden items-center justify-end gap-1 text-xs text-muted-foreground sm:flex">
            <MapPin className="size-3 shrink-0" aria-hidden />
            Location recorded on clock-in
          </p>
        ) : null}
      </div>

      <Button
        variant={actionEnabled ? "default" : "outline"}
        size="sm"
        disabled={isPending || !actionEnabled}
        onClick={handleToggle}
        aria-label={canClockOut ? "Web clock out" : "Web clock in"}
        title={!canClockOut ? LOCATION_HINT : undefined}
        className="h-9 shrink-0 rounded-md px-3.5 text-sm font-medium shadow-none"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isInCooldown && !canClockOut ? (
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Timer className="size-3.5" aria-hidden />
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
