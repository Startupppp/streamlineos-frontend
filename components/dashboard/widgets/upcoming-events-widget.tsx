"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { useUpcomingLeaves } from "@/lib/api/hooks/dashboard";
import { CalendarDays, ExternalLink } from "lucide-react";
import Link from "next/link";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";

function formatRange(startIso: string, endIso: string) {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  if (start.getTime() === end.getTime()) {
    return format(start, "MMM d, yyyy");
  }
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
  }
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export function UpcomingEventsWidget() {
  const { data, isLoading, error } = useUpcomingLeaves();
  const leaves = data ?? [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <CardTitle className="text-sm font-semibold">Upcoming Leaves</CardTitle>
        </div>
        <Link
          href="/calendar"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          aria-label="View calendar"
        >
          Calendar
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : !leaves.length ? (
          <EmptyState
            illustration={<EmptyCalendarIllustration className="h-20 w-20" />}
            title="No upcoming leaves"
            description="No team members have approved leaves in the next 30 days."
            compact
          />
        ) : (
          <ul className="space-y-2">
            {leaves.map((leave) => {
              const days = differenceInCalendarDays(parseISO(leave.endDate), parseISO(leave.startDate)) + 1;
              const initial = (leave.userName ?? "?").trim()[0]?.toUpperCase() ?? "?";
              return (
                <li
                  key={leave.id}
                  className="flex items-start gap-3 rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={resolveImageUrl(leave.userImage)} alt={leave.userName ?? "Employee"} />
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{leave.userName ?? "—"}</p>
                      {leave.leaveType && (
                        <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                          {leave.leaveType.toLowerCase()}
                        </Badge>
                      )}
                    </div>
                    {leave.userDesignation && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {leave.userDesignation}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRange(leave.startDate, leave.endDate)}
                      <span className="text-muted-foreground/60"> · </span>
                      <span className="font-medium tabular-nums">
                        {days} {days === 1 ? "day" : "days"}
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
