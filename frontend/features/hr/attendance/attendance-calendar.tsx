"use client";

import { useState, useMemo, memo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isWeekend,
  isToday,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrMonthlyAttendance, useHrWfhRequests, useHrHolidaysForCalendar } from "@/hooks/api/hr";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAY_LABELS, CalendarDay, statusConfig } from "./attendance-utils";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const LEGEND_STATUSES = [
  "present",
  "wfh",
  "leave",
  "absent",
  "holiday",
  "weekend",
] as const;

export const AttendanceCalendar = memo(function AttendanceCalendar({
  userId,
}: {
  userId: string;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const { data: monthlyLogs, isLoading } = useHrMonthlyAttendance({
    userId,
    year,
    month,
  });
  const { data: wfhRequests } = useHrWfhRequests();
  const { data: holidaysList } = useHrHolidaysForCalendar({ year, month });

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
          wfhMap.add(
            typeof req.date === "string"
              ? req.date
              : format(new Date(req.date), "yyyy-MM-dd"),
          );
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
      if (
        attendanceStatus === "PRESENT" ||
        attendanceStatus === "CHECKED_OUT"
      ) {
        return { date, status: "present" };
      }

      if (isToday(date)) return { date, status: "none" };
      return { date, status: "absent" };
    });
  }, [currentMonth, monthlyLogs, wfhRequests, holidaysList]);

  const startDayOfWeek = getDay(startOfMonth(currentMonth));
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const handlePrevMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));

  const handleNextMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            Attendance Calendar
          </CardTitle>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-semibold text-foreground min-w-[112px] text-center tabular-nums select-none">
              {MONTH_NAMES[month]} {year}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-5 px-5">
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
                  <div
                    key={day}
                    className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1"
                  >
                    {day}
                  </div>
                ))}
                {paddingDays.map((i) => (
                  <div
                    key={`pad-${i}`}
                    className="aspect-square min-w-0 rounded-md"
                  />
                ))}
                {calendarDays.map((day) => {
                  const config = statusConfig[day.status];
                  const dayNum = day.date.getDate();
                  const isTodayDate = isToday(day.date);
                  const isFutureOrNone =
                    day.status === "future" || day.status === "none";
                  const title = day.holidayName
                    ? `${format(day.date, "MMM dd")} – ${day.holidayName}`
                    : `${format(day.date, "MMM dd")}${config.label ? ` – ${config.label}` : ""}`;

                  return (
                    <div
                      key={`${format(day.date, "yyyy-MM-dd")}-${dayNum}`}
                      className={cn(
                        "relative aspect-square flex min-w-0 items-center justify-center rounded-md text-xs font-medium transition-colors duration-200",
                        isFutureOrNone
                          ? "text-muted-foreground/40 hover:bg-muted/40"
                          : cn(
                              config.bg,
                              config.text,
                              "hover:opacity-90 cursor-default",
                            ),
                        isTodayDate &&
                          "ring-2 ring-blue-500 ring-offset-1 ring-offset-background",
                      )}
                      title={title}
                    >
                      {dayNum}
                    </div>
                  );
                })}
              </div>

              <div
                className="flex flex-wrap gap-x-3 gap-y-2 pt-3 mt-3 border-t border-border"
                role="list"
                aria-label="Calendar legend"
              >
                {LEGEND_STATUSES.map((status) => (
                  <div
                    key={status}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
                    role="listitem"
                  >
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        statusConfig[status].dot,
                      )}
                    />
                    {statusConfig[status].label}
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
