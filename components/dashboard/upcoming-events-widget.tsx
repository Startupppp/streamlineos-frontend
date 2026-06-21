"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { WidgetCard } from "@/components/ui/widget-card";
import { usePersonalDashboard } from "@/lib/api/hooks/dashboard";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";

export function UpcomingEventsWidget() {
  const { data, isLoading, error } = usePersonalDashboard();
  const events = data?.upcomingEvents ?? [];

  return (
    <WidgetCard
      icon={CalendarDays}
      title="Upcoming Events"
      link={{ href: "/calendar", label: "Calendar", ariaLabel: "View calendar" }}
      isLoading={isLoading}
      error={error}
      isEmpty={!events.length}
      empty={
        <EmptyState
          illustration={<EmptyCalendarIllustration className="h-20 w-20" />}
          title="No upcoming events"
          description="Your schedule is clear."
          compact
        />
      }
    >
      <ul className="space-y-2 overflow-y-auto max-h-64">
        {events.map((ev) => (
          <li
            key={ev.id}
            className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-2 hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-col items-center text-center rounded-md bg-blue-500/10 px-2 py-1 min-w-[42px] shrink-0">
              <span className="text-[10px] font-medium text-blue-600 uppercase">
                {format(new Date(ev.startTime), "MMM")}
              </span>
              <span className="text-lg font-bold leading-none text-blue-600">
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
            <Badge
              variant="outline"
              className="text-[10px] h-4 px-1.5 shrink-0 capitalize"
            >
              {ev.type.toLowerCase()}
            </Badge>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
