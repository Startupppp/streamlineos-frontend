"use client";

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { format, getDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
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
  Loader2,
  Play,
  Pause,
} from "lucide-react";
import { formatDuration, formatTimerSegment } from "./attendance-utils";
import { cn } from "@/lib/utils";

export const TimerCard = memo(function TimerCard() {
  const [now, setNow] = useState(new Date());
  const [localCooldown, setLocalCooldown] = useState(0);

  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayStr = format(today, "yyyy-MM-dd");
  const isSundayToday = getDay(today) === 0;

  const { data: statusData, isLoading } = useHrAttendanceStatus({
    refetchInterval: 60000,
    staleTime: 30000,
  });
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
    onError: (err) => toast.error(err.message),
  });

  const checkOutMutation = useHrCheckOut({
    onSuccess: () => {
      toast.success("Clocked out successfully");
      setLocalCooldown(120);
    },
    onError: (err) => toast.error(err.message),
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
  const isPending = checkInMutation.isPending || checkOutMutation.isPending;

  const breakStartRef = useRef<number | null>(null);
  const [localExtraBreakMs, setLocalExtraBreakMs] = useState(0);
  const prevBreakHoursRef = useRef<number>(0);

  useEffect(() => {
    if (isOnBreak && !breakStartRef.current) {
      breakStartRef.current = Date.now();
    } else if (!isOnBreak && breakStartRef.current !== null) {
      const duration = Date.now() - breakStartRef.current;
      setLocalExtraBreakMs((prev) => prev + duration);
      breakStartRef.current = null;
    }
  }, [isOnBreak]);

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
    // eslint-disable-next-line react-hooks/refs
    const breakStart = breakStartRef.current;
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
  }, [now, statusData?.todayLog, localExtraBreakMs, isOnBreak]);

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
      breakStartRef.current = Date.now();
    }
    breakMutation.mutate();
  }, [breakMutation, isOnBreak]);

  const dailyStats = statusData?.dailyStats;
  const checkInTime = statusData?.todayLog?.checkIn;

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border border-l-4 border-l-blue-500 bg-card shadow-sm overflow-hidden">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-16 w-16 rounded-xl" />
              <Skeleton className="h-6 w-4" />
              <Skeleton className="h-16 w-16 rounded-xl" />
              <Skeleton className="h-6 w-4" />
              <Skeleton className="h-16 w-16 rounded-xl" />
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-border border-l-4 border-l-blue-500 bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          Time Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pb-5">
        <div
          className="flex items-center justify-center gap-2"
          aria-label={`Session time: ${sessionTimer.hours} hours, ${sessionTimer.minutes} minutes, ${sessionTimer.seconds} seconds`}
        >
          <div className="flex flex-col items-center">
            <div className="bg-muted rounded-xl px-4 py-3 min-w-[64px] text-center">
              <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.hours)}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              HRS
            </span>
          </div>

          <span className="text-2xl font-bold text-blue-500 animate-pulse mb-5">
            :
          </span>

          <div className="flex flex-col items-center">
            <div className="bg-muted rounded-xl px-4 py-3 min-w-[64px] text-center">
              <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.minutes)}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              MIN
            </span>
          </div>

          <span className="text-2xl font-bold text-blue-500 animate-pulse mb-5">
            :
          </span>

          <div className="flex flex-col items-center">
            <div className="bg-muted rounded-xl px-4 py-3 min-w-[64px] text-center">
              <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.seconds)}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              SEC
            </span>
          </div>
        </div>

        <p
          className={cn(
            "text-sm text-center",
            isOnBreak && "text-amber-600 dark:text-amber-400 font-medium",
            isCheckedIn &&
              !isOnBreak &&
              "text-emerald-600 dark:text-emerald-400 font-medium",
            !isActive &&
              !isInCooldown &&
              !isBlockedDay &&
              "text-muted-foreground italic",
            !isActive &&
              isInCooldown &&
              "text-slate-600 dark:text-slate-400 font-medium",
            isBlockedDay && "text-amber-600 dark:text-amber-400 font-medium",
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
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
            >
              <Coffee className="h-3 w-3" /> On Break
            </Badge>
          </div>
        )}

        <div className={isActive ? "grid grid-cols-2 gap-3" : "flex"}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleCheckIn}
                disabled={isActive || isPending || isInCooldown || isBlockedDay}
                variant={isActive ? "secondary" : "default"}
                className={cn(
                  "font-semibold flex-1 gap-1.5 h-9 duration-200",
                  !isActive &&
                    !isInCooldown &&
                    !isBlockedDay &&
                    "bg-emerald-600 hover:bg-emerald-700 text-white",
                )}
              >
                {checkInMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {isInCooldown
                  ? `Wait ${Math.floor(localCooldown / 60)}:${String(localCooldown % 60).padStart(2, "0")}`
                  : "Check In"}
              </Button>
            </TooltipTrigger>
            {isBlockedDay && <TooltipContent>{blockedReason}</TooltipContent>}
          </Tooltip>

          {isActive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleClockAction}
                  disabled={isPending || isBlockedDay}
                  className="font-semibold gap-1.5 h-9 bg-rose-600 hover:bg-rose-700 text-white duration-200"
                >
                  {checkOutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  Check Out
                </Button>
              </TooltipTrigger>
              {isBlockedDay && <TooltipContent>{blockedReason}</TooltipContent>}
            </Tooltip>
          )}
        </div>

        {isActive && (
          <Button
            variant="outline"
            onClick={handleBreakToggle}
            disabled={breakMutation.isPending || isBlockedDay}
            className="w-full gap-1.5 h-9 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/20 duration-200"
          >
            {breakMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isOnBreak ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
            {isOnBreak ? "Resume Work" : "Take Break"}
          </Button>
        )}

        {dailyStats && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Work
              </p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatDuration(dailyStats.workHours)}
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Break
              </p>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                {formatDuration(dailyStats.breakHours)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
