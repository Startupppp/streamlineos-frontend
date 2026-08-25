"use client";

import { useMemo } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isWithinInterval,
} from "date-fns";
import { CalendarDays } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";

import type { ApprovedLeave } from "./leaves-shared";

export function LeaveCalendarWidget({
  approvedLeaves,
}: {
  approvedLeaves: ApprovedLeave[];
}) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const leavesPerDay = useMemo(
    () =>
      days.map((day) => ({
        day,
        leaves: approvedLeaves.filter((leave) => {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          return isWithinInterval(day, { start, end });
        }),
      })),
    [approvedLeaves, days],
  );

  const hasAnyLeave = leavesPerDay.some((d) => d.leaves.length > 0);
  if (!hasAnyLeave) return null;

  const todayStr = format(today, "yyyy-MM-dd");

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="w-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
            <CalendarDays
              className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300"
              aria-hidden="true"
            />
          </div>
          Who&apos;s Out This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-7 gap-1">
          {leavesPerDay.map(({ day, leaves }) => {
            const isToday = format(day, "yyyy-MM-dd") === todayStr;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "rounded-lg p-1.5 min-h-[64px] flex flex-col transition-colors duration-200",
                  isToday
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/30 border border-transparent",
                )}
              >
                <div
                  className={cn(
                    "text-micro font-medium text-center leading-tight mb-1",
                    isToday ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {format(day, "EEE")}
                  <br />
                  <span className={cn("text-dense", isToday && "font-bold")}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-0.5 justify-center">
                  {leaves.slice(0, 3).map((l) => (
                    <Avatar
                      key={l.id}
                      className="h-5 w-5"
                      title={`${l.user?.firstName} ${l.user?.lastName}`}
                    >
                      <AvatarImage src={resolveImageUrl(l.user?.image)} />
                      <AvatarFallback className="text-[8px] bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                        {l.user?.firstName?.[0]}
                        {l.user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {leaves.length > 3 && (
                    <span className="text-[9px] text-muted-foreground self-end">
                      +{leaves.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
