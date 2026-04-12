"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { usePersonalDashboard } from "@/lib/api/hooks/dashboard";
import { CalendarDays, ExternalLink } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export function UpcomingEventsWidget() {
  const { data, isLoading, error } = usePersonalDashboard();
  const events = data?.upcomingEvents ?? [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <CardTitle className="text-sm font-semibold">Upcoming Events</CardTitle>
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
      <CardContent className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : !events.length ? (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming events"
            description="Your schedule is clear."
            compact
          />
        ) : (
          <ul className="space-y-2">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="flex items-start gap-3 rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center text-center rounded-md bg-primary/10 px-2 py-1 min-w-[42px] shrink-0">
                  <span className="text-[10px] font-medium text-primary uppercase">
                    {format(new Date(ev.startTime), "MMM")}
                  </span>
                  <span className="text-lg font-bold leading-none text-primary">
                    {format(new Date(ev.startTime), "d")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(ev.startTime), "h:mm a")}
                    {" – "}
                    {format(new Date(ev.endTime), "h:mm a")}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                  {ev.type.toLowerCase()}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
