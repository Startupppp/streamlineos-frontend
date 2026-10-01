"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useCanState } from "@/hooks/api/access";
import { Briefcase, Coffee } from "lucide-react";
import { formatDuration } from "./attendance-utils";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { hrmsSm, hrmsTransition } from "@/lib/hrms/motion";
import { TimerDigit, TimerSeparator, SessionMetric } from "./attendance-timer-parts";
import { useAttendanceTimer } from "./use-attendance-timer";
import { TimerCardShell } from "./timer-card-shell";
import { TimerCardActions } from "./timer-card-actions";
import { PunchFailureDialog } from "./punch-failure-dialog";
import { AttendanceTodayCard } from "./attendance-today-card";

export interface TimerCardProps {
  chrome?: boolean;
  today?: boolean;
  onRequestWfh?: () => void;
  onRequestRegularization?: () => void;
}

export const TimerCard = memo(function TimerCard({
  chrome = true,
  today = false,
  onRequestWfh,
  onRequestRegularization,
}: TimerCardProps) {
  const timer = useAttendanceTimer();
  const reduced = useReducedMotion();
  const selfAccess = useCanState("self:attendance");

  if (selfAccess === "denied") {
    return (
      <TimerCardShell chrome={chrome}>
        <NoPermissionState
          compact
          permission="self:attendance"
          description="Your role can't record your own attendance."
        />
      </TimerCardShell>
    );
  }

  if (timer.statusFailed) {
    return (
      <TimerCardShell chrome={chrome}>
        <ErrorState
          compact
          title="Attendance unavailable"
          description={getErrorMessage(timer.statusError)}
          onRetry={timer.handleRetryStatus}
        />
      </TimerCardShell>
    );
  }

  if (timer.isLoading || selfAccess === "loading") {
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
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    );
  }

  const handleFailureOpenChange = (open: boolean) => {
    if (!open) timer.dismissPunchFailure();
  };

  const body = (
    <div className="flex flex-col gap-5">
      {today ? (
        <AttendanceTodayCard
          statusLabel={timer.statusLabel}
          lastPunchLabel={timer.lastPunchLabel}
        />
      ) : null}

      <div className="flex justify-center">
        <motion.span
          key={timer.punchAcknowledgement}
          initial={{ opacity: 0.6, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={hrmsTransition(reduced, hrmsSm)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
            timer.isOnBreak &&
              "border-status-warning-rule bg-status-warning-surface text-status-warning-ink",
            timer.isCheckedIn &&
              !timer.isOnBreak &&
              "border-status-success-rule bg-status-success-surface text-status-success-ink",
            !timer.isActive &&
              !timer.isBlockedDay &&
              "border-border bg-muted/50 text-muted-foreground",
            timer.isBlockedDay &&
              "border-status-warning-rule bg-status-warning-surface text-status-warning-ink",
          )}
        >
          {timer.isOnBreak ? <Coffee className="h-3 w-3 text-current" /> : null}
          {timer.isCheckedIn && !timer.isOnBreak ? (
            <span
              className="size-1.5 rounded-full bg-status-success-fill"
              aria-hidden
            />
          ) : null}
          {timer.statusLabel}
        </motion.span>
      </div>

      <div
        className="flex items-end gap-2"
        aria-label={`Session time: ${timer.sessionTimer.hours} hours, ${timer.sessionTimer.minutes} minutes, ${timer.sessionTimer.seconds} seconds`}
      >
        <TimerDigit value={timer.sessionTimer.hours} label="Hrs" />
        <TimerSeparator />
        <TimerDigit value={timer.sessionTimer.minutes} label="Min" />
        <TimerSeparator />
        <TimerDigit value={timer.sessionTimer.seconds} label="Sec" />
      </div>

      <TimerCardActions
        isActive={timer.isActive}
        isOnBreak={timer.isOnBreak}
        isInCooldown={timer.isInCooldown}
        isBlockedDay={timer.isBlockedDay}
        blockedReason={timer.blockedReason}
        cooldownLabel={timer.cooldownLabel}
        isCheckingIn={timer.isCheckingIn}
        isCheckingOut={timer.isCheckingOut}
        isTogglingBreak={timer.isTogglingBreak}
        onCheckIn={timer.handleCheckIn}
        onCheckOut={timer.handleCheckOut}
        onBreakToggle={timer.handleBreakToggle}
      />

      {timer.dailyStats ? (
        <div
          className="flex gap-2"
          role="group"
          aria-label="Today's work and break totals"
        >
          <SessionMetric
            label="Work"
            value={formatDuration(timer.dailyStats.workHours)}
            icon={Briefcase}
            tone="work"
            emphasized={timer.isActive && !timer.isOnBreak}
          />
          <SessionMetric
            label="Break"
            value={formatDuration(timer.dailyStats.breakHours)}
            icon={Coffee}
            tone="break"
            emphasized={timer.isOnBreak}
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <TimerCardShell chrome={chrome}>{body}</TimerCardShell>
      <PunchFailureDialog
        failure={timer.punchFailure}
        onOpenChange={handleFailureOpenChange}
        onRetry={timer.handleCheckIn}
        onRequestWfh={onRequestWfh}
        onRequestRegularization={onRequestRegularization}
      />
    </>
  );
});
