"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { formatEventDate, formatEventTimeRange } from "@/lib/date-utils";
import { EVENT_COLORS } from "./calendar-event-constants";

function agendaWhen(event: CalendarListItem): string {
  if (event.allDay)
    return `${formatEventDate(event.start, event.timezone ?? "UTC")} · All day`;
  return formatEventTimeRange(event.start, event.end, event.timezone);
}

export function CalendarAgendaPreview({
  events,
  maxEvents = 6,
}: {
  events: CalendarListItem[];
  maxEvents?: number;
}) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const upcoming = events
    .filter((e) => new Date(e.start) >= todayStart)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, maxEvents);

  if (upcoming.length === 0)
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">No upcoming events</p>
      </div>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-3">
      {upcoming.map((event) => (
        <div
          key={event.id}
          className="flex items-start gap-3 rounded-md border border-border/50 bg-card px-3 py-2"
        >
          <div
            className="mt-1 h-2 w-2 shrink-0 rounded-full"
            style={{
              backgroundColor: EVENT_COLORS[event.color ?? "blue"] ?? EVENT_COLORS.blue,
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {event.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {agendaWhen(event)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CalendarOverlayFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4"
    >
      <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-panel">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-9 w-24 self-end" />
      </div>
    </div>
  );
}

export function CalendarSheetFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col gap-3 border-l border-border bg-card p-5 shadow-panel"
    >
      <Skeleton className="h-6 w-3/5" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function CalendarListFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="flex min-h-0 flex-1 flex-col gap-2 p-4"
    >
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-5/6" />
      <Skeleton className="h-10 w-4/6" />
    </div>
  );
}
