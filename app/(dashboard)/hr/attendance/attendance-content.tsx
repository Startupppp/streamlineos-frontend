"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWeekend, subMonths, addMonths, isToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useHrAttendanceStatus,
  useHrCheckIn,
  useHrCheckOut,
  useHrToggleBreak,
} from "@/lib/hooks/trpc-hooks";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { WFH_MONTHLY_QUOTA } from "@/lib/leave-policy";
import { RequestWfhDialog } from "@/components/hr/request-wfh-dialog";
import {
  Clock,
  Timer,
  Coffee,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  Loader2,
  Play,
  Pause,
  CalendarDays,
  Download,
  Plus,
  Trash2,
  PartyPopper,
} from "lucide-react";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface CalendarDay {
  date: Date;
  status: "present" | "wfh" | "leave" | "absent" | "weekend" | "holiday" | "future" | "none";
  holidayName?: string;
}

const statusConfig = {
  present: { label: "Present", bg: "bg-emerald-500", text: "text-white", dot: "bg-emerald-500" },
  wfh: { label: "WFH", bg: "bg-blue-500", text: "text-white", dot: "bg-blue-500" },
  leave: { label: "Leave", bg: "bg-amber-600", text: "text-white", dot: "bg-amber-600" },
  absent: { label: "Absent", bg: "bg-rose-500", text: "text-white", dot: "bg-rose-500" },
  weekend: { label: "Weekend", bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground/40" },
  holiday: { label: "Holiday", bg: "bg-[#bd882c]", text: "text-white", dot: "bg-[#bd882c]" },
  future: { label: "", bg: "", text: "", dot: "" },
  none: { label: "", bg: "", text: "", dot: "" },
} as const;

const tableStatusBadge: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  ABSENT: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  ON_BREAK: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  CHECKED_OUT: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400",
};

function formatDuration(hours: string | number | null | undefined): string {
  const h = typeof hours === "string" ? parseFloat(hours) : (hours ?? 0);
  if (h <= 0) return "0h 0m";
  const wholeHours = Math.floor(h);
  const minutes = Math.round((h - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

function formatTimerSegment(val: number): string {
  return String(val).padStart(2, "0");
}

/* ─────────────────────── Timer Card ─────────────────────── */

const TimerCard = memo(function TimerCard() {
  const [now, setNow] = useState(new Date());
  const [localCooldown, setLocalCooldown] = useState(0);

  const { data: statusData, isLoading } = useHrAttendanceStatus({ refetchInterval: 60000, staleTime: 30000 });

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

  const breakMutation = useHrToggleBreak({
    onSuccess: () => toast.success("Break toggled"),
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (statusData?.cooldownRemaining && statusData.cooldownRemaining > 0) {
      setLocalCooldown(statusData.cooldownRemaining);
    }
  }, [statusData?.cooldownRemaining]);

  useEffect(() => {
    if (localCooldown <= 0) return;
    const timer = setTimeout(() => setLocalCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [localCooldown]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isCheckedIn = statusData?.status === "PRESENT";
  const isOnBreak = statusData?.status === "ON_BREAK";
  const isActive = isCheckedIn || isOnBreak;
  const isInCooldown = localCooldown > 0;
  const isPending = checkInMutation.isPending || checkOutMutation.isPending;

  const sessionTimer = useMemo(() => {
    if (!statusData?.todayLog?.checkIn || statusData?.todayLog?.checkOut) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    const checkInTime = new Date(statusData.todayLog.checkIn);
    const breakMs = (Number(statusData.todayLog.breakHours) || 0) * 3600000;
    const diffMs = Math.max(0, now.getTime() - checkInTime.getTime() - breakMs);
    return {
      hours: Math.floor(diffMs / 3600000),
      minutes: Math.floor((diffMs % 3600000) / 60000),
      seconds: Math.floor((diffMs % 60000) / 1000),
    };
  }, [now, statusData?.todayLog]);

  const handleClockAction = useCallback(() => {
    if (isActive) {
      checkOutMutation.mutate();
    } else if (!isInCooldown) {
      checkInMutation.mutate({ location: undefined });
    }
  }, [isActive, isInCooldown, checkInMutation, checkOutMutation]);

  const handleBreakToggle = useCallback(() => {
    breakMutation.mutate();
  }, [breakMutation]);

  const dailyStats = statusData?.dailyStats;
  const checkInTime = statusData?.todayLog?.checkIn;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-24 w-64" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#bd882c]" />
          Time Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Digit boxes */}
        <div
          className="flex items-center justify-center gap-2"
          aria-label={`Session time: ${sessionTimer.hours} hours, ${sessionTimer.minutes} minutes, ${sessionTimer.seconds} seconds`}
        >
          {/* Hours */}
          <div className="flex flex-col items-center">
            <div className="bg-muted rounded-lg px-3 py-3 min-w-[56px] text-center">
              <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.hours)}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              HRS
            </span>
          </div>

          {/* Colon */}
          <span className="text-2xl font-bold text-[#bd882c] animate-pulse mb-5">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <div className="bg-muted rounded-lg px-3 py-3 min-w-[56px] text-center">
              <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.minutes)}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              MIN
            </span>
          </div>

          {/* Colon */}
          <span className="text-2xl font-bold text-[#bd882c] animate-pulse mb-5">:</span>

          {/* Seconds */}
          <div className="flex flex-col items-center">
            <div className="bg-muted rounded-lg px-3 py-3 min-w-[56px] text-center">
              <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {formatTimerSegment(sessionTimer.seconds)}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
              SEC
            </span>
          </div>
        </div>

        {/* Status caption */}
        <p className="text-sm text-muted-foreground text-center italic">
          {isOnBreak && "On break"}
          {isCheckedIn && checkInTime && `Checked in at ${format(new Date(checkInTime), "hh:mm a")}`}
          {!isActive && !isInCooldown && "Not clocked in"}
          {!isActive && isInCooldown && `Cooldown: ${Math.floor(localCooldown / 60)}:${String(localCooldown % 60).padStart(2, "0")}`}
        </p>

        {isOnBreak && (
          <div className="flex justify-center">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800">
              <Coffee className="h-3 w-3 mr-1" /> On Break
            </Badge>
          </div>
        )}

        {/* 2-column button grid */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => {
              if (!isActive && !isInCooldown) checkInMutation.mutate({ location: undefined });
            }}
            disabled={isActive || isPending || isInCooldown}
            variant={isActive ? "secondary" : "default"}
            className={`font-semibold ${
              !isActive && !isInCooldown
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : ""
            }`}
          >
            {checkInMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <LogIn className="h-4 w-4 mr-2" />
            )}
            {isInCooldown
              ? `Wait ${Math.floor(localCooldown / 60)}:${String(localCooldown % 60).padStart(2, "0")}`
              : "Check In"}
          </Button>

          <Button
            onClick={handleClockAction}
            disabled={!isActive || isPending}
            variant={isActive ? "default" : "secondary"}
            className={`font-semibold ${
              isActive
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : ""
            }`}
          >
            {checkOutMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            Check Out
          </Button>
        </div>

        {/* Break toggle */}
        {isActive && (
          <Button
            variant="outline"
            onClick={handleBreakToggle}
            disabled={breakMutation.isPending}
            className="w-full"
          >
            {breakMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : isOnBreak ? (
              <Play className="h-4 w-4 mr-2" />
            ) : (
              <Pause className="h-4 w-4 mr-2" />
            )}
            {isOnBreak ? "Resume Work" : "Take Break"}
          </Button>
        )}

        {/* Daily stats */}
        {dailyStats && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Work</p>
              <p className="text-sm font-semibold">{formatDuration(dailyStats.workHours)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Break</p>
              <p className="text-sm font-semibold">{formatDuration(dailyStats.breakHours)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/* ─────────────────────── WFH Balances Card ─────────────────────── */

const WfhBalancesCard = memo(function WfhBalancesCard() {
  const { data: requests, isLoading } = api.hr.getWfhRequests.useQuery();

  const stats = useMemo(() => {
    if (!requests) return { approved: 0, pending: 0, remaining: WFH_MONTHLY_QUOTA };
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthRequests = requests.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const approved = thisMonthRequests.filter((r) => r.status === "APPROVED").length;
    const pending = thisMonthRequests.filter((r) => r.status === "PENDING").length;
    return { approved, pending, remaining: Math.max(0, WFH_MONTHLY_QUOTA - approved) };
  }, [requests]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const usedPercent = (stats.approved / WFH_MONTHLY_QUOTA) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Home className="h-5 w-5 text-[#bd882c]" />
          WFH Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar with fraction */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Monthly Quota</span>
            <span className="font-semibold">{stats.approved} / {WFH_MONTHLY_QUOTA}</span>
          </div>
          <Progress
            value={usedPercent}
            className="h-2.5"
            aria-label={`${stats.approved} of ${WFH_MONTHLY_QUOTA} WFH days used`}
          />
        </div>

        {/* Remaining line */}
        <p className="text-sm text-muted-foreground text-center">
          Remaining Balance:{" "}
          <span className="font-semibold text-foreground">{stats.remaining} Days</span>
          {" "}/ Year
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.remaining}</p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-3 text-center">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-3 text-center">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>

        {/* Apply for WFH button */}
        <RequestWfhDialog
          trigger={
            <Button className="w-full" variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Apply for WFH
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
});

/* ─────────────────────── Attendance Calendar ─────────────────────── */

const AttendanceCalendar = memo(function AttendanceCalendar({ userId }: { userId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const { data: monthlyLogs, isLoading } = api.hr.getMonthlyAttendance.useQuery(
    { userId, year, month },
    { enabled: !!userId }
  );

  const { data: wfhRequests } = api.hr.getWfhRequests.useQuery();
  const { data: holidaysList } = api.hr.getHolidaysForCalendar.useQuery({ year, month });

  const calendarDays = useMemo((): CalendarDay[] => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const today = new Date();

    const attendanceMap = new Map<string, string>();
    if (monthlyLogs) {
      for (const log of monthlyLogs) {
        attendanceMap.set(log.date, log.status || "PRESENT");
      }
    }

    const wfhMap = new Set<string>();
    if (wfhRequests) {
      for (const req of wfhRequests) {
        if (req.status === "APPROVED") {
          wfhMap.add(typeof req.date === "string" ? req.date : format(new Date(req.date), "yyyy-MM-dd"));
        }
      }
    }

    const holidayMap = new Map<string, string>();
    if (holidaysList) {
      for (const h of holidaysList) {
        holidayMap.set(h.date, h.name);
      }
    }

    return days.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const holidayName = holidayMap.get(dateStr);

      if (holidayName) return { date, status: "holiday", holidayName };

      if (date > today) return { date, status: "future" };
      if (isWeekend(date)) return { date, status: "weekend" };

      if (wfhMap.has(dateStr)) return { date, status: "wfh" };

      const attendanceStatus = attendanceMap.get(dateStr);
      if (attendanceStatus === "PRESENT" || attendanceStatus === "CHECKED_OUT") {
        return { date, status: "present" };
      }

      if (isToday(date)) return { date, status: "none" };

      return { date, status: "absent" };
    });
  }, [currentMonth, monthlyLogs, wfhRequests, holidaysList]);

  const startDayOfWeek = getDay(startOfMonth(currentMonth));
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const handlePrevMonth = useCallback(() => setCurrentMonth((prev) => subMonths(prev, 1)), []);
  const handleNextMonth = useCallback(() => setCurrentMonth((prev) => addMonths(prev, 1)), []);

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#bd882c]/10">
              <CalendarDays className="h-4 w-4 text-[#bd882c]" />
            </div>
            Attendance Calendar
          </CardTitle>
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[110px] text-center text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <div className="max-w-[340px] mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-md" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_LABELS.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider py-1">
                    {day}
                  </div>
                ))}
                {paddingDays.map((i) => (
                  <div key={`pad-${i}`} className="aspect-square min-w-0 rounded-md" />
                ))}
                {calendarDays.map((day) => {
                  const config = statusConfig[day.status];
                  const dayNum = day.date.getDate();
                  const isTodayDate = isToday(day.date);
                  const isFutureOrNone = day.status === "future" || day.status === "none";
                  const title = day.holidayName
                    ? `${format(day.date, "MMM dd")} – ${day.holidayName}`
                    : `${format(day.date, "MMM dd")}${config.label ? ` – ${config.label}` : ""}`;
                  return (
                    <div
                      key={`${format(day.date, "yyyy-MM-dd")}-${dayNum}`}
                      className={`relative aspect-square flex min-w-0 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                        isFutureOrNone
                          ? "text-muted-foreground/40"
                          : `${config.bg} ${config.text}`
                      } ${isTodayDate ? "ring-2 ring-[#bd882c] ring-offset-1 ring-offset-background" : ""}`}
                      title={title}
                    >
                      {dayNum}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-4 pt-3 mt-1 border-t border-border" role="list" aria-label="Calendar legend">
                {(["present", "wfh", "leave", "absent", "holiday", "weekend"] as const).map((status) => (
                  <div key={status} className="flex items-center gap-2 text-xs text-muted-foreground" role="listitem">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusConfig[status].dot}`} />
                    <span>{statusConfig[status].label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

/* ─────────────────────── Manage Holidays (Admin) ─────────────────────── */

const ManageHolidaysCard = memo(function ManageHolidaysCard() {
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [message, setMessage] = useState("");

  const utils = api.useUtils();
  const { data: holidaysList, isLoading } = api.hr.getHolidaysForYear.useQuery({ year: currentYear });
  const addMutation = api.hr.addHoliday.useMutation({
    onSuccess: () => {
      toast.success("Holiday added");
      setName("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setMessage("");
      utils.hr.getHolidaysForYear.invalidate();
      utils.hr.getHolidaysForCalendar.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = api.hr.deleteHoliday.useMutation({
    onSuccess: () => {
      toast.success("Holiday removed");
      utils.hr.getHolidaysForYear.invalidate();
      utils.hr.getHolidaysForCalendar.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter holiday name");
      return;
    }
    addMutation.mutate({
      name: name.trim(),
      date: new Date(date),
      message: message.trim() || undefined,
    });
  };

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#bd882c]/10">
            <PartyPopper className="h-4 w-4 text-[#bd882c]" />
          </div>
          Company Holidays
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <form onSubmit={handleAdd} className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="holiday-name">Name</Label>
              <Input
                id="holiday-name"
                placeholder="e.g. Republic Day"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-date">Date</Label>
              <Input
                id="holiday-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="holiday-message">Message (optional)</Label>
            <Input
              id="holiday-message"
              placeholder="Optional note for notification"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-background"
            />
          </div>
          <Button type="submit" disabled={addMutation.isPending} className="w-full sm:w-auto">
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Holiday
          </Button>
        </form>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Holidays for {currentYear}</p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : holidaysList && holidaysList.length > 0 ? (
            <ul className="space-y-1.5 rounded-lg border border-border divide-y divide-border">
              {holidaysList.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-2 py-2.5 px-3 first:pt-2 last:pb-2"
                >
                  <div>
                    <span className="font-medium text-foreground">{h.name}</span>
                    <span className="text-muted-foreground text-sm ml-2">{h.date}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteMutation.mutate({ holidayId: h.id })}
                    disabled={deleteMutation.isPending}
                    aria-label={`Remove ${h.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center rounded-lg border border-dashed border-border">
              No holidays added yet. Add one above.
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Employees see holidays on the calendar and get an in-app notification one day before.
        </p>
      </CardContent>
    </Card>
  );
});

/* ─────────────────────── Daily History Table ─────────────────────── */

const DailyHistoryTable = memo(function DailyHistoryTable() {
  const { data, isLoading } = useHrAttendanceStatus();

  const logs = data?.logs || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Daily History</CardTitle>
          <button
            className="text-sm text-[#bd882c] hover:text-[#a67724] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            disabled={logs.length === 0}
            onClick={async () => {
              try {
                const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
                const rows = logs.map((log) => ({
                  date: log.date ? format(new Date(log.date), "yyyy-MM-dd") : "",
                  checkIn: log.checkIn ? format(new Date(log.checkIn), "hh:mm a") : "",
                  checkOut: log.checkOut ? format(new Date(log.checkOut), "hh:mm a") : "",
                  totalHours: log.workHours || "",
                  status: log.status || "PRESENT",
                }));
                await downloadXlsx(`attendance-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`, [
                  {
                    name: "Attendance",
                    columns: [
                      { header: "Date", key: "date", width: 15 },
                      { header: "Check In", key: "checkIn", width: 15 },
                      { header: "Check Out", key: "checkOut", width: 15 },
                      { header: "Total Hours", key: "totalHours", width: 15 },
                      { header: "Status", key: "status", width: 15 },
                    ],
                    rows,
                  },
                ]);
                toast.success("Report downloaded");
              } catch {
                toast.error("Failed to generate report");
              }
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download Report
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="overflow-x-auto border border-border rounded-md" role="region" aria-label="Attendance records table" tabIndex={0}>
          <Table className="border-collapse">
            <caption className="sr-only">Recent attendance history</caption>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">Check In</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">Check Out</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">Total Hours</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold border border-border px-4 py-2.5 text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground border border-border">
                    No attendance records found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, idx) => {
                  const statusKey = log.status || "PRESENT";
                  return (
                    <TableRow key={log.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      <TableCell className="font-medium border border-border px-4 py-2.5">
                        {format(new Date(log.date), "EEE, MMM dd")}
                      </TableCell>
                      <TableCell className="font-mono text-sm border border-border px-4 py-2.5">
                        {log.checkIn ? format(new Date(log.checkIn), "hh:mm a") : "--"}
                      </TableCell>
                      <TableCell className="font-mono text-sm border border-border px-4 py-2.5">
                        {log.checkOut ? format(new Date(log.checkOut), "hh:mm a") : "--"}
                      </TableCell>
                      <TableCell className="border border-border px-4 py-2.5">{log.workHours ? formatDuration(log.workHours) : "--"}</TableCell>
                      <TableCell className="border border-border px-4 py-2.5">
                        <Badge
                          className={`text-xs font-semibold border-0 ${
                            tableStatusBadge[statusKey] || tableStatusBadge.PRESENT
                          }`}
                        >
                          {statusKey === "CHECKED_OUT" ? "Checked Out" : statusKey === "ON_BREAK" ? "On Break" : statusKey.charAt(0) + statusKey.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
});

/* ─────────────────────── Main Layout ─────────────────────── */

export function AttendanceContent({ userId, isAdmin = false }: { userId: string; isAdmin?: boolean }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      <motion.div variants={fadeUp} className="lg:col-span-4 space-y-6">
        <TimerCard />
        <WfhBalancesCard />
      </motion.div>

      <motion.div variants={fadeUp} className="lg:col-span-8 space-y-6">
        <AttendanceCalendar userId={userId} />
        {isAdmin && <ManageHolidaysCard />}
        <DailyHistoryTable />
      </motion.div>
    </motion.div>
  );
}
