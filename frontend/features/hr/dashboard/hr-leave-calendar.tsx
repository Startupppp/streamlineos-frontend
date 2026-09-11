"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { HrStatusBadge } from "@/features/hr/shared/hr-ui";
import { getErrorMessage } from "@/lib/get-error-message";
import { useHrLeaveCalendar } from "@/hooks/api/hr/dashboard";

function LeaveCalendarSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 min-w-0 space-y-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function HrLeaveCalendar() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, isError, error, refetch } = useHrLeaveCalendar(month, year);

  function handlePrevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const displayDate = new Date(year, month - 1, 1);

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-semibold">Leave calendar</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm tabular-nums min-w-[7.5rem] text-center">
            {format(displayDate, "MMMM yyyy")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-2">
          <LeaveCalendarSkeleton />
        </div>
      ) : isError ? (
        <ErrorState
          title="Couldn't load leave calendar"
          description={getErrorMessage(error)}
          onRetry={() => void refetch()}
          className="py-6"
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          illustration={<Calendar className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />}
          title="No leaves this month"
          description="No approved leave requests for this period."
          className="border-0 bg-transparent min-h-[120px]"
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {data.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.userName}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {format(new Date(entry.startDate), "MMM d")}
                  {entry.startDate !== entry.endDate
                    ? ` – ${format(new Date(entry.endDate), "MMM d")}`
                    : ""}
                  {" · "}
                  {entry.leaveType}
                </p>
              </div>
              <HrStatusBadge status={entry.status} />
            </li>
          ))}
        </ul>
      )}

      {data && data.length > 0 && (
        <div className="px-4 py-2 border-t border-border/60">
          <Badge variant="outline" className="text-micro">
            {data.length} {data.length === 1 ? "leave" : "leaves"}
          </Badge>
        </div>
      )}
    </div>
  );
}
