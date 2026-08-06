"use client";

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { format, getDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
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
  Clock,
  Coffee,
  LogIn,
  LogOut,
  Play,
  Pause,
} from "lucide-react";
import { formatDuration, formatTimerSegment } from "./attendance-utils";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";

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
      isOnBreak && breakStart
        ? now.getTime() - breakStart
        : 0;
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

  const handleClockAction = useCallback(() => {
    const localDate = format(new Date(), "yyyy-MM-dd");
    if (isActive) {
      checkOutMutation.mutate({ localDate });
    } else if (!isInCooldown) {
      checkInMutation.mutate({ location: undefined, localDate });
    }
  }, [isActive, isInCooldown, checkInMutation, checkOutMutation]);

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

  if (isLoading) {
    return (
      <div
        className={cn(
          "space-y-4 p-4",
          chrome && "overflow-hidden rounded-xl border border-border bg-card",
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <Skeleton className="h-5 w-3" />
            <Skeleton className="h-14 w-14 rounded-lg" />
            <Skeleton className="h-5 w-3" />
            <Skeleton className="h-14 w-14 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const body = (
    <div className="space-y-4">
        <div
          className="flex items-center justify-center gap-2"
          aria-label={`Session time: ${sessionTimer.hours} hours, ${sessionTimer.minutes} minutes, ${sessionTimer.seconds} seconds`}
        >
          <div className="flex flex-col items-center">
            <div className="min-w-[56px] rounded-lg bg-muted px-3 py-2.5 text-center">
              <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.hours)}
              </span>
            </div>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Hrs
            </span>
          </div>

          <span className="mb-4 text-xl font-bold text-muted-foreground">:</span>

          <div className="flex flex-col items-center">
            <div className="min-w-[56px] rounded-lg bg-muted px-3 py-2.5 text-center">
              <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.minutes)}
              </span>
            </div>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Min
            </span>
          </div>

          <span className="mb-4 text-xl font-bold text-muted-foreground">:</span>

          <div className="flex flex-col items-center">
            <div className="min-w-[56px] rounded-lg bg-muted px-3 py-2.5 text-center">
              <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.seconds)}
              </span>
            </div>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sec
            </span>
          </div>
        </div>

        <p
          className={cn(
            "text-center text-sm",
            isOnBreak && "font-medium text-amber-600 dark:text-amber-300",
            isCheckedIn &&
              !isOnBreak &&
              "font-medium text-emerald-600 dark:text-emerald-300",
            !isActive &&
              !isInCooldown &&
              !isBlockedDay &&
              "italic text-muted-foreground",
            !isActive && isInCooldown && "font-medium text-muted-foreground",
            isBlockedDay && "font-medium text-amber-600 dark:text-amber-300",
          )}
        >
          {isOnBreak && "On break"}
          {isCheckedIn &&
            !isOnBreak &&
            checkInTime &&
            `Checked in at ${format(new Date(checkInTime), "hh:mm a")}`}
          {!isActive && !isInCooldown && !isBlockedDay && "Not clocked in"}
          {!isActive &&
            isInCooldown &&
            `Cooldown: ${Math.floor(localCooldown / 60)}:${String(localCooldown % 60).padStart(2, "0")}`}
          {isBlockedDay &&
            (isSundayToday
              ? "Sunday — no check-in"
              : `Holiday: ${todayHolidayName}`)}
        </p>

        {isOnBreak && (
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            >
              <Coffee className="h-3 w-3" /> On Break
            </Badge>
          </div>
        )}

        <TooltipProvider>
          <div className={isActive ? "grid grid-cols-2 gap-2" : "flex"}>
            <Tooltip>
              <TooltipTrigger asChild>
                <LoadingButton
                  onClick={handleCheckIn}
                  disabled={isActive || isInCooldown || isBlockedDay || checkOutMutation.isPending}
                  isPending={checkInMutation.isPending}
                  variant={isActive ? "secondary" : "default"}
                  className={cn(
                    "h-9 flex-1 gap-1.5 font-semibold",
                    !isActive &&
                      !isInCooldown &&
                      !isBlockedDay &&
                      "bg-emerald-600 text-white hover:bg-emerald-700",
                  )}
                >
                  <LogIn className="h-4 w-4" />
                  {isInCooldown
                    ? `Wait ${Math.floor(localCooldown / 60)}:${String(localCooldown % 60).padStart(2, "0")}`
                    : "Check In"}
                </LoadingButton>
              </TooltipTrigger>
              {isBlockedDay && <TooltipContent>{blockedReason}</TooltipContent>}
            </Tooltip>

            {isActive && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <LoadingButton
                    onClick={handleClockAction}
                    disabled={isBlockedDay || checkInMutation.isPending}
                    isPending={checkOutMutation.isPending}
                    className="h-9 gap-1.5 bg-rose-600 font-semibold text-white hover:bg-rose-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Check Out
                  </LoadingButton>
                </TooltipTrigger>
                {isBlockedDay && <TooltipContent>{blockedReason}</TooltipContent>}
              </Tooltip>
            )}
          </div>
        </TooltipProvider>

        {isActive && (
          <LoadingButton
            variant="outline"
            onClick={handleBreakToggle}
            disabled={isBlockedDay}
            isPending={breakMutation.isPending}
            className="h-9 w-full gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10"
          >
            {isOnBreak ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
            {isOnBreak ? "Resume Work" : "Take Break"}
          </LoadingButton>
        )}

        {dailyStats && (
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
            <div>
              <p className="text-[11px] text-muted-foreground">Work</p>
              <p className="text-sm font-semibold tabular-nums">
                {formatDuration(dailyStats.workHours)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Break</p>
              <p className="text-sm font-semibold tabular-nums">
                {formatDuration(dailyStats.breakHours)}
              </p>
            </div>
          </div>
        )}
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
