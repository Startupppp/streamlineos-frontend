"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format, getDay } from "date-fns";
import { toast } from "sonner";
import {
  useHrAttendanceStatus,
  useHrCheckIn,
  useHrCheckOut,
  useHrToggleBreak,
  useHrHolidaysForCalendar,
} from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";

export function useAttendanceTimer() {
  const [now, setNow] = useState(new Date());
  const [localCooldown, setLocalCooldown] = useState(0);

  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayStr = format(today, "yyyy-MM-dd");
  const isSundayToday = getDay(today) === 0;

  const {
    data: statusData,
    isLoading,
    isError: statusFailed,
    error: statusError,
    refetch: refetchStatus,
  } = useHrAttendanceStatus();
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
    });
  }, [checkInMutation]);

  const handleCheckOut = useCallback(() => {
    checkOutMutation.mutate();
  }, [checkOutMutation]);

  const handleBreakToggle = useCallback(() => {
    const goingOnBreak = !isOnBreak;
    setLocalBreakOverride(goingOnBreak);
    if (goingOnBreak) {
      setBreakStart(Date.now());
    }
    breakMutation.mutate();
  }, [breakMutation, isOnBreak]);

  const handleRetryStatus = useCallback(() => {
    void refetchStatus();
  }, [refetchStatus]);

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
    isCheckingIn: checkInMutation.isPending,
    isCheckingOut: checkOutMutation.isPending,
    isTogglingBreak: breakMutation.isPending,
  };
}
