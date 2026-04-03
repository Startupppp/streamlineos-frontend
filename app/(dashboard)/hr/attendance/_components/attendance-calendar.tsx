"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWeekend, subMonths, addMonths, isToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrMonthlyAttendance, useHrWfhRequests, useHrHolidaysForCalendar } from "@/lib/api/hooks/hr";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { WEEKDAY_LABELS, CalendarDay, statusConfig } from "./attendance-utils";

export const AttendanceCalendar = memo(function AttendanceCalendar({ userId }: { userId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const { data: monthlyLogs, isLoading } = useHrMonthlyAttendance({ userId, year, month });
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
