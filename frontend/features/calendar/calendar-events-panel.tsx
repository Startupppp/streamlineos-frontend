"use client";

import { useMemo } from "react";
import { format, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { TruncatedText } from "@/components/ui/truncated-text";

const EVENT_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a855f7",
  gold: "#3b82f6",
};

interface CalendarEventsPanelProps {
  mode: "list" | "history";
  events: CalendarListItem[];
  range?: { start: Date; end: Date };
  onSelectEvent: (eventId: string) => void;
}

function groupByDate(events: CalendarListItem[]): Map<string, CalendarListItem[]> {
  const groups = new Map<string, CalendarListItem[]>();
  for (const event of events) {
    const key = format(new Date(event.start), "yyyy-MM-dd");
    const existing = groups.get(key);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(key, [event]);
    }
  }
  return groups;
}

export function CalendarEventsPanel({
  mode,
  events,
  range,
  onSelectEvent,
}: CalendarEventsPanelProps) {
  const filteredEvents = useMemo(() => {
    const now = new Date();

    if (mode === "history") {
      return events
        .filter((e) => new Date(e.end) < now)
        .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    }

    const inRange = range
      ? events.filter((e) =>
          isWithinInterval(new Date(e.start), { start: range.start, end: range.end }),
        )
      : events;

    return inRange.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
  }, [events, mode, range]);

  const grouped = useMemo(() => groupByDate(filteredEvents), [filteredEvents]);

  const isEmpty = filteredEvents.length === 0;

  return (
    <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
      <div className="flex min-h-full w-full flex-1 flex-col overscroll-contain p-4">
        {isEmpty ? (
          <EmptyState
            illustrationPreset="calendar"
            title={mode === "history" ? "No past events" : "No events in this period"}
            description={
              mode === "history"
                ? "Events that have ended will appear here."
                : "Try a different date range or add a new event."
            }
            className="h-full min-h-0 flex-1 border-0 bg-transparent shadow-none"
          />
        ) : (
          <div className="max-w-3xl space-y-5">
            {[...grouped.entries()].map(([dateKey, dayEvents]) => (
              <section key={dateKey}>
                <h3 className="sticky top-0 z-10 mb-2 bg-card py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
                </h3>
                <ul className="space-y-2">
                  {dayEvents.map((event) => {
                    const color =
                      EVENT_COLORS[event.color ?? "blue"] ?? EVENT_COLORS.blue;
                    const start = new Date(event.start);
                    const end = new Date(event.end);
                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() => onSelectEvent(event.id)}
                          className={cn(
                            "w-full rounded-lg border border-l-4 bg-card p-3 text-left shadow-xs transition-colors hover:bg-muted/40",
                          )}
                          style={{ borderLeftColor: color }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <TruncatedText
                                text={event.title}
                                className="text-sm font-semibold text-foreground"
                              />
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {event.allDay
                                  ? "All day"
                                  : `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`}
                              </p>
                              {event.location ? (
                                <TruncatedText
                                  text={event.location}
                                  className="mt-1 text-dense text-muted-foreground"
                                />
                              ) : null}
                            </div>
                            <span className="shrink-0 text-micro uppercase tracking-wide text-muted-foreground">
                              {event.category}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
