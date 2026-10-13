"use client";

import { format } from "date-fns";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CalendarListItem, CalendarSearchResponse } from "@/hooks/api/calendar-types";

function nextAction(event: CalendarListItem): string {
  if (event.actions.complete) return "Complete";
  if (event.actions.rsvp) return "Respond";
  if (event.actions.edit) return "Edit";
  return "View";
}

function kind(event: CalendarListItem, now: number): "action" | "preparation" | "information" {
  if (event.actions.complete || event.actions.rsvp) return "action";
  if (event.timeKind === "timed" && new Date(event.start).getTime() > now) return "preparation";
  return "information";
}

function EventGroup({
  title,
  events,
  onSelectEvent,
}: {
  title: string;
  events: CalendarListItem[];
  onSelectEvent: (event: CalendarListItem) => void;
}) {
  if (events.length === 0) return null;
  return (
    <section className="space-y-2" aria-label={title}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {events.map((event) => (
          <div key={`${event.sourceKey}:${event.occurrenceId}`} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <div className="min-w-0 space-y-1">
              <div className="truncate text-sm font-medium">{event.title}</div>
              <div className="text-xs text-muted-foreground">
                {event.timeKind === "date" ? "All day" : format(new Date(event.start), "p")} · {event.source} · {event.status ?? "Scheduled"}
              </div>
              <div className="text-xs text-muted-foreground">
                {event.freshness.state === "stale" ? "Source may be stale" : event.freshness.state === "unknown" ? "Source freshness unknown" : "Source current"}
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onSelectEvent(event)}>
              {nextAction(event)}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CalendarMyDayPanel({
  events,
  pages,
  search,
  onSearchChange,
  onSelectEvent,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: {
  events: CalendarListItem[];
  pages: CalendarSearchResponse[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelectEvent: (event: CalendarListItem) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
}) {
  const now = Date.now();
  const actions = events.filter((event) => kind(event, now) === "action");
  const preparation = events.filter((event) => kind(event, now) === "preparation");
  const information = events.filter((event) => kind(event, now) === "information");
  const incomplete = pages.some((page) => page.coverageState !== "complete" || page.truncated && !page.nextCursor);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      <label className="relative mb-4 block">
        <span className="sr-only">Search My Day</span>
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search authorized events" className="pl-9" />
      </label>
      {incomplete ? <div role="status" className="mb-4 rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-2 text-xs text-status-warning-ink">Some calendar sources are incomplete. Search results may be missing items.</div> : null}
      {events.length === 0 ? <p className="text-sm text-muted-foreground">No matching items in this day.</p> : null}
      <div className="space-y-5">
        <EventGroup title="Action needed" events={actions} onSelectEvent={onSelectEvent} />
        <EventGroup title="Prepare for" events={preparation} onSelectEvent={onSelectEvent} />
        <EventGroup title="For your information" events={information} onSelectEvent={onSelectEvent} />
      </div>
      {hasMore ? <Button type="button" variant="outline" className="mt-4 self-start" disabled={isLoadingMore} onClick={onLoadMore}>{isLoadingMore ? "Loading…" : "Load more"}</Button> : null}
    </div>
  );
}
