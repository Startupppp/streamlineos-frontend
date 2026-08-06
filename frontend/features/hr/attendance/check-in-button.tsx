"use client";

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { format, getDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useHrAttendanceStatus,
  useHrCheckIn,
  useHrCheckOut,
  useHrToggleBreak,
  useHrHolidaysForCalendar,
} from "@/hooks/api/hr";
import { toast } from "sonner";
import {
  Briefcase,
  Clock,
  Coffee,
  LogIn,
  LogOut,
  Pause,
  Play,
  type LucideIcon,
} from "lucide-react";
import { formatDuration, formatTimerSegment } from "./attendance-utils";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";

function TimerDigit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <div className="flex h-16 w-full items-center justify-center rounded-xl border border-border bg-muted/40">
        <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-foreground sm:text-4xl">
          {formatTimerSegment(value)}
        </span>
      </div>
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function TimerSeparator() {
  return (
    <span
      className="mb-5 select-none text-xl font-semibold text-muted-foreground/50"
      aria-hidden
    >
      :
    </span>
  );
}

function SessionMetric({
  label,
  value,
  icon: Icon,
  tone,
  emphasized,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "work" | "break";
  emphasized: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl border px-3 py-3 transition-colors",
        emphasized &&
          tone === "work" &&
          "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10",
        emphasized &&
          tone === "break" &&
          "border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10",
        !emphasized && "border-border/80 bg-muted/30",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5",
          emphasized && tone === "work" && "text-emerald-700 dark:text-emerald-300",
          emphasized && tone === "break" && "text-amber-700 dark:text-amber-300",
          !emphasized && "text-muted-foreground",
        )}
      >
        <Icon className="size-3.5 shrink-0 text-current" aria-hidden />
        <span className="text-[11px] font-medium uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "font-mono text-lg font-semibold tabular-nums tracking-tight",
          emphasized ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export const TimerCard = memo(function TimerCard({
  chrome = true,
}: {
  chrome?: boolean;
}) {
  const [now, setNow] = useState(new Date());
  const [localCooldown, setLocalCooldown] = useState(0);

  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayStr = format(today, "yyyy-MM-dd");
  const isSundayToday = getDay(today) === 0;

  const { data: statusData, isLoading } = useHrAttendanceStatus();
  const { data: holidaysList } = useHrHolidaysForCalendar({
    year: todayYear,
    month: todayMonth,
  });

  const todayHolidayName = useMemo(() => {
    if (!holidaysList) return null;
    const match = holidaysList.find((h) => h.date === todayStr);
    return match?.name ?? null;
  }, [holidaysList, todayStr]);

  const isBlockedDay = isSundayToday || !!todayHolidayName;
  const blockedReason = isSundayToday
    ? "Check-in is not available on Sundays"
    : todayHolidayName
      ? `Today is a holiday (${todayHolidayName}) — check-in is not available`
      : null;

  const checkInMutation = useHrCheckIn({
    onSuccess: () => {
      toast.success("Clocked in successfully");
      setLocalCooldown(0);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const checkOutMutation = useHrCheckOut({
    onSuccess: () => {
      toast.success("Clocked out successfully");
      setLocalCooldown(120);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const [localBreakOverride, setLocalBreakOverride] = useState<boolean | null>(
    null,
  );

  const breakMutation = useHrToggleBreak({
    onSuccess: () => toast.success("Break toggled"),
    onError: () => {
      setLocalBreakOverride(null);
      toast.error("Failed to toggle break");
    },
  });

  useEffect(() => {
    if (statusData?.cooldownRemaining && statusData.cooldownRemaining > 0) {
      setLocalCooldown(statusData.cooldownRemaining);
    }
  }, [statusData?.cooldownRemaining]);

  useEffect(() => {
    if (localCooldown <= 0) return;
    const timer = setTimeout(
      () => setLocalCooldown((prev) => Math.max(0, prev - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [localCooldown]);

  useEffect(() => {
    if (statusData) setLocalBreakOverride(null);
  }, [statusData?.status, statusData]);

  const isCheckedIn =
    statusData?.status === "PRESENT" ||
    (localBreakOverride === false && statusData?.status === "ON_BREAK");
  const isOnBreak =
    localBreakOverride !== null
      ? localBreakOverride
      : statusData?.status === "ON_BREAK";
  const isActive = isCheckedIn || isOnBreak;
  const isInCooldown = localCooldown > 0;

  const [breakStart, setBreakStart] = useState<number | null>(null);
  const [localExtraBreakMs, setLocalExtraBreakMs] = useState(0);
  const prevBreakHoursRef = useRef<number>(0);

  useEffect(() => {
    if (isOnBreak && breakStart === null) {
      setBreakStart(Date.now());
    } else if (!isOnBreak && breakStart !== null) {
      const duration = Date.now() - breakStart;
      setLocalExtraBreakMs((prev) => prev + duration);
      setBreakStart(null);
    }
  }, [isOnBreak, breakStart]);

  useEffect(() => {
    const serverBreakHours = Number(statusData?.todayLog?.breakHours) || 0;
    if (serverBreakHours > prevBreakHoursRef.current) {
      setLocalExtraBreakMs(0);
      prevBreakHoursRef.current = serverBreakHours;
    }
  }, [statusData?.todayLog?.breakHours]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sessionTimer = useMemo(() => {
    if (!statusData?.todayLog?.checkIn || statusData?.todayLog?.checkOut) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    const checkInTime = new Date(statusData.todayLog.checkIn);
    const serverBreakMs =
      (Number(statusData.todayLog.breakHours) || 0) * 3600000;
    const totalBreakMs = serverBreakMs + localExtraBreakMs;
    const currentBreakMs =
      isOnBreak && breakStart ? now.getTime() - breakStart : 0;
    const allBreakMs = totalBreakMs + currentBreakMs;
    const diffMs = Math.max(
      0,
      now.getTime() - checkInTime.getTime() - allBreakMs,
    );
    return {
      hours: Math.floor(diffMs / 3600000),
      minutes: Math.floor((diffMs % 3600000) / 60000),
      seconds: Math.floor((diffMs % 60000) / 1000),
    };
  }, [now, statusData?.todayLog, localExtraBreakMs, isOnBreak, breakStart]);

  const handleCheckIn = useCallback(() => {
    checkInMutation.mutate({
      location: undefined,
      localDate: format(new Date(), "yyyy-MM-dd"),
    });
  }, [checkInMutation]);

  const handleCheckOut = useCallback(() => {
    checkOutMutation.mutate({ localDate: format(new Date(), "yyyy-MM-dd") });
  }, [checkOutMutation]);

  const handleBreakToggle = useCallback(() => {
    const goingOnBreak = !isOnBreak;
    setLocalBreakOverride(goingOnBreak);
    if (goingOnBreak) {
      setBreakStart(Date.now());
    }
    breakMutation.mutate();
  }, [breakMutation, isOnBreak]);

  const dailyStats = statusData?.dailyStats;
  const checkInTime = statusData?.todayLog?.checkIn;
  const cooldownLabel = `${Math.floor(localCooldown / 60)}:${String(localCooldown % 60).padStart(2, "0")}`;

  const statusLabel = isBlockedDay
    ? isSundayToday
      ? "Sunday — check-in unavailable"
      : `Holiday · ${todayHolidayName}`
    : isOnBreak
      ? "On break"
      : isCheckedIn && checkInTime
        ? `Checked in · ${format(new Date(checkInTime), "h:mm a")}`
        : isInCooldown
          ? `Cooldown · ${cooldownLabel}`
          : "Not clocked in";

  if (isLoading) {
    return (
      <div
        className={cn(
          "space-y-5 p-1",
          chrome && "overflow-hidden rounded-xl border border-border bg-card p-4",
        )}
      >
        <Skeleton className="mx-auto h-6 w-36 rounded-full" />
        <div className="flex items-end gap-2">
          <Skeleton className="h-16 flex-1 rounded-xl" />
          <Skeleton className="mb-5 h-5 w-2" />
          <Skeleton className="h-16 flex-1 rounded-xl" />
          <Skeleton className="mb-5 h-5 w-2" />
          <Skeleton className="h-16 flex-1 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  const body = (
    <div className="flex flex-col gap-5">
      <div className="flex justify-center">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
            isOnBreak &&
              "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
            isCheckedIn &&
              !isOnBreak &&
              "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
            !isActive &&
              !isBlockedDay &&
              "border-border bg-muted/50 text-muted-foreground",
            isBlockedDay &&
              "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
          )}
        >
          {isOnBreak ? <Coffee className="h-3 w-3 text-current" /> : null}
          {isCheckedIn && !isOnBreak ? (
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          ) : null}
          {statusLabel}
        </span>
      </div>

      <div
        className="flex items-end gap-2"
        aria-label={`Session time: ${sessionTimer.hours} hours, ${sessionTimer.minutes} minutes, ${sessionTimer.seconds} seconds`}
      >
        <TimerDigit value={sessionTimer.hours} label="Hrs" />
        <TimerSeparator />
        <TimerDigit value={sessionTimer.minutes} label="Min" />
        <TimerSeparator />
        <TimerDigit value={sessionTimer.seconds} label="Sec" />
      </div>

      <TooltipProvider>
        <div className="flex flex-col gap-2">
          {!isActive ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <LoadingButton
                  onClick={handleCheckIn}
                  disabled={isInCooldown || isBlockedDay || checkOutMutation.isPending}
                  isPending={checkInMutation.isPending}
                  className="h-10 w-full gap-1.5 font-semibold"
                >
                  <LogIn className="h-4 w-4 text-current" />
                  {isInCooldown ? `Wait ${cooldownLabel}` : "Check In"}
                </LoadingButton>
              </TooltipTrigger>
              {isBlockedDay ? (
                <TooltipContent>{blockedReason}</TooltipContent>
              ) : null}
            </Tooltip>
          ) : null}

          {isActive && !isOnBreak ? (
            <>
              <LoadingButton
                onClick={handleCheckOut}
                disabled={isBlockedDay || checkInMutation.isPending}
                isPending={checkOutMutation.isPending}
                className="h-10 w-full gap-1.5 bg-rose-600 font-semibold text-white hover:bg-rose-700"
              >
                <LogOut className="h-4 w-4 text-current" />
                Check Out
              </LoadingButton>
              <LoadingButton
                variant="outline"
                onClick={handleBreakToggle}
                disabled={isBlockedDay}
                isPending={breakMutation.isPending}
                className="h-10 w-full gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
              >
                <Pause className="h-4 w-4 text-current" />
                Take Break
              </LoadingButton>
            </>
          ) : null}

          {isOnBreak ? (
            <>
              <LoadingButton
                onClick={handleBreakToggle}
                disabled={isBlockedDay}
                isPending={breakMutation.isPending}
                className="h-10 w-full gap-1.5 bg-amber-600 font-semibold text-white hover:bg-amber-700"
              >
                <Play className="h-4 w-4 text-current" />
                Resume Work
              </LoadingButton>
              <LoadingButton
                variant="outline"
                onClick={handleCheckOut}
                disabled={isBlockedDay || checkInMutation.isPending}
                isPending={checkOutMutation.isPending}
                className="h-10 w-full gap-1.5"
              >
                <LogOut className="h-4 w-4 text-current" />
                Check Out
              </LoadingButton>
            </>
          ) : null}
        </div>
      </TooltipProvider>

      {dailyStats ? (
        <div
          className="flex gap-2"
          role="group"
          aria-label="Today's work and break totals"
        >
          <SessionMetric
            label="Work"
            value={formatDuration(dailyStats.workHours)}
            icon={Briefcase}
            tone="work"
            emphasized={isActive && !isOnBreak}
          />
          <SessionMetric
            label="Break"
            value={formatDuration(dailyStats.breakHours)}
            icon={Coffee}
            tone="break"
            emphasized={isOnBreak}
          />
        </div>
      ) : null}
    </div>
  );

  if (!chrome) {
    return body;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="shrink-0 border-b px-4 pb-3 pt-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Time Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-4">{body}</CardContent>
    </Card>
  );
});
