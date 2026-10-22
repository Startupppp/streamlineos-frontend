"use client";

import { useState, useEffect } from "react";
import { getDay } from "date-fns";
import { useOrgTimeZone } from "@/hooks/api/org-display";
import { formatTimeInOrgTz, todayInOrgTz } from "@/lib/date-utils";
import { toast } from "sonner";
import {
  useHrAttendanceStatus,
  useHrCheckIn,
  useHrCheckOut,
  useHrToggleBreak,
  useHrHolidaysForCalendar,
} from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { classifyPunchFailure, type PunchFailureKind } from "./punch-failure";
import { useSourceOverride } from "@/hooks/common/use-source-override";

export interface PunchFailure {
  kind: PunchFailureKind;
  message: string;
}

export function useAttendanceTimer() {
  const orgTz = useOrgTimeZone();

  const {
    data: statusData,
    isLoading,
    isError: statusFailed,
    error: statusError,
    refetch: refetchStatus,
  } = useHrAttendanceStatus();

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayStr = todayInOrgTz(orgTz);
  const isSundayToday = getDay(today) === 0;

  const { data: holidaysList } = useHrHolidaysForCalendar({
    year: todayYear,
    month: todayMonth,
  });

  const todayHolidayName = holidaysList?.find((h) => h.date === todayStr)?.name ?? null;

  const isBlockedDay = isSundayToday || !!todayHolidayName;
  const blockedReason = isSundayToday
    ? "Check-in is not available on Sundays"
    : todayHolidayName
      ? `Today is a holiday (${todayHolidayName}) — check-in is not available`
      : null;

  const [now, setNow] = useState(new Date());
  const serverCooldown = statusData?.cooldownRemaining ?? 0;
  const [mutationCooldown, setMutationCooldown] = useState(0);
  const localCooldown = Math.max(serverCooldown, mutationCooldown);

  const [punchFailure, setPunchFailure] = useState<PunchFailure | null>(null);
  const [punchAcknowledgement, setPunchAcknowledgement] = useState(0);

  const checkInMutation = useHrCheckIn({
    onSuccess: () => {
      toast.success("Clocked in successfully");
      setMutationCooldown(0);
      setPunchFailure(null);
      setPunchAcknowledgement((count) => count + 1);
    },
    onError: (err) => {
      const message = getErrorMessage(err);
      setPunchFailure({ kind: classifyPunchFailure(message), message });
    },
  });

  const checkOutMutation = useHrCheckOut({
    onSuccess: () => {
      toast.success("Clocked out successfully");
      setMutationCooldown(120);
      setPunchAcknowledgement((count) => count + 1);
    },
    onError: (err) => {
      const message = getErrorMessage(err);
      setPunchFailure({ kind: classifyPunchFailure(message), message });
    },
  });

  const statusSource = statusData?.status ?? null;
  const [localBreakOverride, setLocalBreakOverride] = useSourceOverride<
    string | null,
    boolean | null
  >(statusSource, null);

  const [breakStart, setBreakStart] = useState<number | null>(null);
  const [localExtraBreakMs, setLocalExtraBreakMs] = useState(0);

  const breakMutation = useHrToggleBreak({
    onSuccess: () => toast.success("Break toggled"),
    onError: () => {
      setLocalBreakOverride(null);
      toast.error("Failed to toggle break");
    },
  });

  useEffect(() => {
    if (mutationCooldown <= 0) return;
    const timer = setTimeout(
      () => setMutationCooldown((prev) => Math.max(0, prev - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [mutationCooldown]);

  const isCheckedIn =
    statusData?.status === "PRESENT" ||
    (localBreakOverride === false && statusData?.status === "ON_BREAK");
  const isOnBreak =
    localBreakOverride !== null
      ? localBreakOverride
      : statusData?.status === "ON_BREAK";
  const isActive = isCheckedIn || isOnBreak;
  const isInCooldown = localCooldown > 0;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentBreakMs =
    isOnBreak && breakStart !== null ? now.getTime() - breakStart : 0;

  const sessionTimer = (() => {
    if (!statusData?.todayLog?.checkIn || statusData?.todayLog?.checkOut) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    const checkInTime = new Date(statusData.todayLog.checkIn);
    const serverBreakMs =
      (Number(statusData.todayLog.breakHours) || 0) * 3600000;
    const allBreakMs = serverBreakMs + localExtraBreakMs + currentBreakMs;
    const diffMs = Math.max(
      0,
      now.getTime() - checkInTime.getTime() - allBreakMs,
    );
    return {
      hours: Math.floor(diffMs / 3600000),
      minutes: Math.floor((diffMs % 3600000) / 60000),
      seconds: Math.floor((diffMs % 60000) / 1000),
    };
  })();

  function handleCheckIn() {
    checkInMutation.mutate({});
  }

  function handleCheckOut() {
    checkOutMutation.mutate();
  }

  function handleBreakToggle() {
    const goingOnBreak = !isOnBreak;
    setLocalBreakOverride(goingOnBreak);
    if (goingOnBreak) {
      setBreakStart(Date.now());
    } else {
      if (breakStart !== null) {
        setLocalExtraBreakMs((prev) => prev + Date.now() - breakStart);
      }
      setBreakStart(null);
    }
    breakMutation.mutate();
  }

  function handleRetryStatus() {
    void refetchStatus();
  }

  function dismissPunchFailure() {
    setPunchFailure(null);
  }

  const dailyStats = statusData?.dailyStats;
  const checkInTime = statusData?.todayLog?.checkIn;
  const checkOutTime = statusData?.todayLog?.checkOut;
  const lastPunchLabel = checkOutTime
    ? `Checked out · ${formatTimeInOrgTz(checkOutTime, orgTz)}`
    : checkInTime
      ? `Checked in · ${formatTimeInOrgTz(checkInTime, orgTz)}`
      : null;
  const cooldownLabel = `${Math.floor(localCooldown / 60)}:${String(localCooldown % 60).padStart(2, "0")}`;

  const statusLabel = isBlockedDay
    ? isSundayToday
      ? "Sunday — check-in unavailable"
      : `Holiday · ${todayHolidayName}`
    : isOnBreak
      ? "On break"
      : isCheckedIn && checkInTime
        ? `Checked in · ${formatTimeInOrgTz(checkInTime, orgTz)}`
        : isInCooldown
          ? `Cooldown · ${cooldownLabel}`
          : "Not clocked in";

  return {
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
    punchFailure,
    dismissPunchFailure,
    punchAcknowledgement,
    lastPunchLabel,
    isCheckingIn: checkInMutation.isPending,
    isCheckingOut: checkOutMutation.isPending,
    isTogglingBreak: breakMutation.isPending,
  };
}
