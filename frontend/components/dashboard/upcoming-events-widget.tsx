"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { WidgetCard } from "@/components/ui/widget-card";
import { usePersonalDashboard } from "@/hooks/api/dashboard";
import { CalendarDays } from "lucide-react";
import { format, isToday } from "date-fns";
import { TruncatedText } from "@/components/ui/truncated-text";

interface UpcomingEvent {
  id: number;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  type: string;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function EventRow({ ev }: { ev: UpcomingEvent }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-2 hover:bg-muted/50 transition-colors">
      <div className="flex flex-col items-center text-center rounded-md bg-primary/10 px-2 py-1 min-w-[42px] shrink-0">
        <span className="text-[10px] font-medium text-primary uppercase">
          {format(new Date(ev.startTime), "MMM")}
        </span>
        <span className="text-lg font-bold leading-none text-primary">
          {format(new Date(ev.startTime), "d")}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <TruncatedText text={ev.title} className="text-sm font-medium" />
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
  );
}

export function UpcomingEventsWidget() {
  const { data, isLoading, error } = usePersonalDashboard();
  const events = data?.upcomingEvents ?? [];
  const todayEvents = events.filter((ev) => isToday(new Date(ev.startTime)));
  const laterEvents = events.filter((ev) => !isToday(new Date(ev.startTime)));

  return (
    <WidgetCard
      icon={CalendarDays}
      title="Upcoming Events"
      link={{
        href: "/calendar",
        label: "Calendar",
        ariaLabel: "View calendar",
      }}
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
      <div className="space-y-3 overflow-y-auto max-h-64">
        {todayEvents.length > 0 && (
          <div className="space-y-2">
            <SectionLabel>Today</SectionLabel>
            <ul className="space-y-2">
              {todayEvents.map((ev) => (
                <EventRow key={ev.id} ev={ev} />
              ))}
            </ul>
          </div>
        )}
        {laterEvents.length > 0 && (
          <div className="space-y-2">
            {todayEvents.length > 0 && <SectionLabel>Upcoming</SectionLabel>}
            <ul className="space-y-2">
              {laterEvents.map((ev) => (
                <EventRow key={ev.id} ev={ev} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
