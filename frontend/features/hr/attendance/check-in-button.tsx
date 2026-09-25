"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useCanState } from "@/hooks/api/access";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Briefcase,
  Clock,
  Coffee,
  LogIn,
  LogOut,
  Pause,
  Play,
} from "lucide-react";
import { formatDuration } from "./attendance-utils";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { TimerDigit, TimerSeparator, SessionMetric } from "./attendance-timer-parts";
import { useAttendanceTimer } from "./use-attendance-timer";

export const TimerCard = memo(function TimerCard({
  chrome = true,
}: {
  chrome?: boolean;
}) {
  const {
    isLoading,
    statusFailed,
    statusError,
    handleRetryStatus,
    isCheckedIn,
    isOnBreak,
    isActive,
    isInCooldown,
    isBlockedDay,
    blockedReason,
    statusLabel,
    cooldownLabel,
    sessionTimer,
    dailyStats,
    handleCheckIn,
    handleCheckOut,
    handleBreakToggle,
    isCheckingIn,
    isCheckingOut,
    isTogglingBreak,
  } = useAttendanceTimer();
  // The status read and every punch go to /me/attendance/* (self:attendance).
  // Without it the disabled status query looked like "Not clocked in" beside
  // an enabled Check In that could only 403.
  const selfAccess = useCanState("self:attendance");

  if (selfAccess === "denied") {
    const denied = (
      <NoPermissionState
        compact
        permission="self:attendance"
        description="Your role can't record your own attendance."
      />
    );
    if (!chrome) return denied;
    return (
      <Card className="overflow-hidden">
        <CardHeader className="shrink-0 border-b px-4 pb-3 pt-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Time Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-4">{denied}</CardContent>
      </Card>
    );
  }

  if (statusFailed) {
    /*
     * Without this branch a failed status read fell through to the normal body,
     * which reads `statusData?.todayLog` as absent and renders "Not clocked in"
     * beside an enabled Check In button — an outage rendered as an authoritative
     * statement about the reader's own day, with nothing announced. The card
     * says it could not find out instead, and offers the read again.
     */
    const failure = (
      <ErrorState
        compact
        title="Attendance unavailable"
        description={getErrorMessage(statusError)}
        onRetry={handleRetryStatus}
      />
    );
    if (!chrome) return failure;
    return (
      <Card className="overflow-hidden">
        <CardHeader className="shrink-0 border-b px-4 pb-3 pt-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Time Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-4">{failure}</CardContent>
      </Card>
    );
  }

  if (isLoading || selfAccess === "loading") {
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
              "border-status-warning-rule bg-status-warning-surface text-status-warning-ink",
            isCheckedIn &&
              !isOnBreak &&
              "border-status-success-rule bg-status-success-surface text-status-success-ink",
            !isActive &&
              !isBlockedDay &&
              "border-border bg-muted/50 text-muted-foreground",
            isBlockedDay &&
              "border-status-warning-rule bg-status-warning-surface text-status-warning-ink",
          )}
        >
          {isOnBreak ? <Coffee className="h-3 w-3 text-current" /> : null}
          {isCheckedIn && !isOnBreak ? (
            <span className="size-1.5 rounded-full bg-status-success-fill" aria-hidden />
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
                  disabled={isInCooldown || isBlockedDay || isCheckingOut}
                  isPending={isCheckingIn}
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
                disabled={isBlockedDay || isCheckingIn}
                isPending={isCheckingOut}
                className="h-10 w-full gap-1.5 bg-status-danger-fill font-semibold text-white hover:bg-status-danger-fill-hover"
              >
                <LogOut className="h-4 w-4 text-current" />
                Check Out
              </LoadingButton>
              <LoadingButton
                variant="outline"
                onClick={handleBreakToggle}
                disabled={isBlockedDay}
                isPending={isTogglingBreak}
                className="h-10 w-full gap-1.5 border-status-warning-rule text-status-warning-ink hover:bg-status-warning-surface hover:text-status-warning-ink"
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
                isPending={isTogglingBreak}
                className="h-10 w-full gap-1.5 bg-status-warning-fill font-semibold text-white hover:bg-status-warning-fill-hover"
              >
                <Play className="h-4 w-4 text-current" />
                Resume Work
              </LoadingButton>
              <LoadingButton
                variant="outline"
                onClick={handleCheckOut}
                disabled={isBlockedDay || isCheckingIn}
                isPending={isCheckingOut}
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
