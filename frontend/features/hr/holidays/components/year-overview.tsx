"use client";

import { format, parseISO, eachMonthOfInterval, startOfYear, endOfYear, endOfMonth, getYear } from "date-fns";
import { RotateCcw } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { Holiday } from "@/hooks/api/hr/holidays";

interface YearOverviewProps {
  holidays: Holiday[];
  yearFilter: number | "all";
}

export function YearOverview({ holidays, yearFilter }: YearOverviewProps) {
  const year = yearFilter === "all" ? getYear(new Date()) : yearFilter;
  const months = eachMonthOfInterval({ start: startOfYear(new Date(year, 0)), end: endOfYear(new Date(year, 0)) });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        const monthHolidays = holidays.filter((h) => {
          const d = parseISO(h.date);
          return d >= monthStart && d <= monthEnd;
        });
        return (
          <div key={monthStart.toISOString()} className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              {format(monthStart, "MMMM")}
            </p>
            {monthHolidays.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No holidays</p>
            ) : (
              <div className="space-y-1">
                {monthHolidays.map((h) => (
                  <div key={h.id} className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground tabular-nums w-5 shrink-0">
                      {format(parseISO(h.date), "d")}
                    </span>
                    <TruncatedText text={h.name} className="text-xs text-muted-foreground" />
                    {h.recurring && <RotateCcw className="h-2.5 w-2.5 text-muted-foreground/60 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
            {monthHolidays.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                {monthHolidays.length} holiday{monthHolidays.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
