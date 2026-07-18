"use client";

import { useState, useMemo, useCallback } from "react";
import {
  format,
  eachWeekOfInterval,
  startOfYear,
  endOfYear,
  addDays,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAttendanceHeatmap } from "@/hooks/api/hr";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_COUNT = 53;
const CELL = "h-3 w-3 rounded-[2px]";

const intensityClasses: Record<number, string> = {
  0: "bg-muted/40 dark:bg-muted/20",
  1: "bg-blue-200 dark:bg-blue-900/60",
  2: "bg-blue-400 dark:bg-blue-700",
  3: "bg-blue-600 dark:bg-blue-500",
  4: "bg-blue-800 dark:bg-blue-300",
};

function HeatmapSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl bg-muted/10 p-3" aria-hidden>
      <div className="inline-block min-w-max">
        <div className="relative mb-1 ml-8 h-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="absolute h-2.5 w-6"
              style={{ left: `${i * ((WEEK_COUNT * 14) / 12)}px` }}
            />
          ))}
        </div>
        <div className="mt-1 flex gap-0.5">
          <div className="mr-1.5 flex flex-col gap-0.5">
            {DAY_LABELS.map((d, i) => (
              <div
                key={d}
                className={`h-3 text-[10px] leading-3 text-muted-foreground ${i % 2 === 0 ? "invisible" : ""}`}
              >
                {d}
              </div>
            ))}
          </div>
          {Array.from({ length: WEEK_COUNT }).map((_, col) => (
            <div key={col} className="flex flex-col gap-0.5">
              {Array.from({ length: 7 }).map((__, row) => (
                <Skeleton key={row} className={CELL} />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1.5 pl-8">
          <Skeleton className="h-2.5 w-8" />
          {[0, 1, 2, 3, 4].map((level) => (
            <Skeleton key={level} className={CELL} />
          ))}
          <Skeleton className="h-2.5 w-8" />
        </div>
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 py-0.5">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-2.5 w-12" />
        </div>
      ))}
    </div>
  );
}

export function AttendanceHeatmap({ userId }: { userId: string }) {
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading, isFetching } = useAttendanceHeatmap({ userId, year });
  const showSkeleton = isLoading || (isFetching && !data);

  const handlePrevYear = useCallback(() => setYear((y) => y - 1), []);
  const handleNextYear = useCallback(() => setYear((y) => y + 1), []);

  const { weeks, monthPositions } = useMemo(() => {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 11, 31));

    const heatmapMap = new Map<string, { hours: number; intensity: number }>();
    if (data?.heatmap) {
      for (const d of data.heatmap) {
        heatmapMap.set(d.date, { hours: d.hours, intensity: d.intensity });
      }
    }

    const weekStarts = eachWeekOfInterval({ start: yearStart, end: yearEnd });
    const weeksData = weekStarts.map((weekStart) => {
      return Array.from({ length: 7 }, (_, dayIdx) => {
        const date = addDays(weekStart, dayIdx);
        if (date < yearStart || date > yearEnd) return null;
        const dateStr = format(date, "yyyy-MM-dd");
        const entry = heatmapMap.get(dateStr);
        return {
          date,
          dateStr,
          hours: entry?.hours ?? 0,
          intensity: entry?.intensity ?? 0,
        };
      });
    });

    const positions: { month: number; col: number }[] = [];
    weeksData.forEach((week, colIdx) => {
      const firstValid = week.find((d) => d !== null);
      if (firstValid) {
        const m = firstValid.date.getMonth();
        if (
          positions.length === 0 ||
          positions[positions.length - 1].month !== m
        ) {
          positions.push({ month: m, col: colIdx });
        }
      }
    });

    return { weeks: weeksData, monthPositions: positions };
  }, [year, data]);

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            Attendance Heatmap
          </CardTitle>
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
            <AnimatedIconButton
              icon={ChevronLeftIcon}
              iconSize={16}
              variant="ghost"
              size="icon"
              className="w-8 duration-200"
              onClick={handlePrevYear}
              aria-label="Previous year"
            />
            <span className="text-sm font-semibold min-w-[50px] text-center text-foreground">
              {year}
            </span>
            <AnimatedIconButton
              icon={ChevronRightIcon}
              iconSize={16}
              variant="ghost"
              size="icon"
              className="w-8 duration-200"
              onClick={handleNextYear}
              disabled={year >= new Date().getFullYear()}
              aria-label="Next year"
            />
          </div>
        </div>
        {showSkeleton ? (
          <SummarySkeleton />
        ) : data?.summary ? (
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-3 md:grid-cols-4">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm font-bold text-foreground tabular-nums">
                {data.summary.totalDays}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Days
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm font-bold text-foreground tabular-nums">
                {data.summary.totalHours}h
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Hours
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm font-bold text-foreground tabular-nums">
                {data.summary.avgHoursPerDay}h
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Avg/Day
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm font-bold text-foreground tabular-nums">
                {data.summary.longestStreak}d
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Streak
              </span>
            </div>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="pb-5">
        {showSkeleton ? (
          <HeatmapSkeleton />
        ) : (
          <div className="overflow-x-auto rounded-xl bg-muted/10 p-3">
            <div className="inline-block min-w-max">
              <div className="relative mb-1 ml-8 h-4">
                {monthPositions.map(({ month, col }) => (
                  <div
                    key={`${month}-${col}`}
                    className="absolute text-[10px] text-muted-foreground"
                    style={{ left: `${col * 14}px` }}
                  >
                    {MONTH_LABELS[month]}
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-0.5">
                <div className="mr-1.5 flex flex-col gap-0.5">
                  {DAY_LABELS.map((d, i) => (
                    <div
                      key={d}
                      className={`h-3 text-[10px] leading-3 text-muted-foreground ${i % 2 === 0 ? "invisible" : ""}`}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                {weeks.map((week, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-0.5">
                    {week.map((day, rowIdx) => {
                      if (!day) {
                        return <div key={rowIdx} className="h-3 w-3" />;
                      }
                      const cls =
                        intensityClasses[day.intensity] ?? intensityClasses[0];
                      const title =
                        day.hours > 0
                          ? `${format(day.date, "MMM d, yyyy")} — ${day.hours}h`
                          : format(day.date, "MMM d, yyyy");
                      return (
                        <div
                          key={rowIdx}
                          className={`${CELL} cursor-default transition-opacity duration-200 hover:opacity-70 ${cls}`}
                          title={title}
                          role="gridcell"
                          aria-label={title}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1.5 pl-8">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Less
                </span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`${CELL} ${intensityClasses[level]}`}
                  />
                ))}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  More
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
