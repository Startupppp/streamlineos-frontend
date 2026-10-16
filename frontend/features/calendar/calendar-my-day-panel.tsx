"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Key } from "react";
import { Search } from "lucide-react";
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EVENT_COLORS } from "./calendar-event-constants";
import type { CalendarListItem, CalendarSearchResponse } from "@/hooks/api/calendar-types";
import { formatEventTimeRange } from "@/lib/date-utils";
import { calendarSearchIsPartial } from "./calendar-search-coverage";
import { CalendarVirtualScroll } from "./calendar-virtual-scroll";
import { CalendarLoadingStatus } from "./calendar-lazy-fallbacks";

type MyDayRow =
  | { type: "header"; title: string }
  | { type: "event"; event: CalendarListItem };

interface MyDayRowData {
  rows: MyDayRow[];
  onSelectEvent: (event: CalendarListItem) => void;
}

function freshnessLabel(event: CalendarListItem): string {
  if (event.freshness.state === "stale") return "May be stale";
  if (event.freshness.state === "unknown") return "Freshness unknown";
  return "Current";
}

function nextAction(event: CalendarListItem): string {
  if (event.actions.complete) return "Complete";
  if (event.actions.rsvp) return "Respond";
  if (event.actions.edit) return "Edit";
  if (event.actions.delete) return "Manage";
  return "View";
}

function kind(event: CalendarListItem, now: number): "action" | "preparation" | "information" {
  if (event.actions.complete || event.actions.rsvp || event.actions.edit || event.actions.delete) return "action";
  if (event.timeKind === "timed" && new Date(event.start).getTime() > now)
    return "preparation";
  return "information";
}

function rowKey(index: number, data: MyDayRowData): Key {
  const row = data.rows[index];
  if (!row) return index;
  return row.type === "header" ? `header:${row.title}` : `event:${row.event.sourceKey}:${row.event.occurrenceId}`;
}

function MyDayVirtualRow({ index, style, ariaAttributes, rows, onSelectEvent }: RowComponentProps<MyDayRowData>) {
  const row = rows[index];
  if (!row) return <div style={style} {...ariaAttributes} />;
  if (row.type === "header")
    return (
      <div style={style} {...ariaAttributes} className="flex items-end gap-3 px-4 pb-2">
        <h3 className="shrink-0 text-xs font-medium text-muted-foreground">{row.title}</h3>
        <div className="mb-1 h-px min-w-8 flex-1 bg-border" />
      </div>
    );

  const event = row.event;
  const rail = EVENT_COLORS[event.color ?? "blue"] ?? EVENT_COLORS.blue;
  const timeLabel = event.timeKind === "date" ? "All day" : formatEventTimeRange(event.start, event.end, event.timezone);
  const action = nextAction(event);
  function handleSelectEvent() {
    onSelectEvent(event);
  }
  return (
    <div style={{ ...style, padding: "0 16px 8px", boxSizing: "border-box" }} {...ariaAttributes}>
      <div className="flex overflow-hidden rounded-lg border bg-card shadow-xs transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-sm">
        <div className="w-1 shrink-0" style={{ backgroundColor: rail }} />
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3 p-3">
          <div className="min-w-0 space-y-1.5">
            <div className="truncate text-sm font-medium">{event.title}</div>
            <p className="text-xs text-muted-foreground">{timeLabel}</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="capitalize">{event.source}</Badge>
              <Badge variant="outline">{event.status ?? "Scheduled"}</Badge>
              <Badge variant="outline">{freshnessLabel(event)}</Badge>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={handleSelectEvent} aria-label={`Open ${event.title}, ${timeLabel}, ${event.source} to ${action.toLowerCase()}`}>
            {action}
          </Button>
        </div>
      </div>
    </div>
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
  const [now, setNow] = useState(() => Date.now());
  const lastRequestedPageRef = useRef<{ search: string; page: CalendarSearchResponse | undefined } | null>(null);
  const rows = useMemo<MyDayRow[]>(() => {
    const groups: Array<{ title: string; events: CalendarListItem[] }> = [
      { title: "Action needed", events: [] },
      { title: "Prepare for", events: [] },
      { title: "For your information", events: [] },
    ];
    for (const event of events) {
      const category = kind(event, now);
      const group = category === "action" ? groups[0] : category === "preparation" ? groups[1] : groups[2];
      group?.events.push(event);
    }
    return groups.flatMap((group) => group.events.length === 0
      ? []
      : [{ type: "header" as const, title: group.title }, ...group.events.map((event) => ({ type: "event" as const, event }))]);
  }, [events, now]);
  const rowProps = useMemo<MyDayRowData>(() => ({ rows, onSelectEvent }), [rows, onSelectEvent]);
  const heightKey = useMemo(
    () => rows.map((row) => row.type === "header" ? `header:${row.title}` : `event:${row.event.sourceKey}:${row.event.occurrenceId}`).join("|"),
    [rows],
  );
  const rowHeight = useDynamicRowHeight({ defaultRowHeight: 104, key: heightKey });
  const incomplete = calendarSearchIsPartial(pages, hasMore);
  const requestMore = useCallback(() => {
    const page = pages.at(-1);
    if (!hasMore || isLoadingMore || (lastRequestedPageRef.current?.search === search && lastRequestedPageRef.current.page === page)) return;
    lastRequestedPageRef.current = { search, page };
    onLoadMore();
  }, [hasMore, isLoadingMore, onLoadMore, pages, search]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (rows.length === 0) requestMore();
  }, [rows.length, requestMore]);
  const handleRowsRendered = useCallback(
    ({ stopIndex }: { startIndex: number; stopIndex: number }) => {
      if (stopIndex >= rows.length - 1) requestMore();
    },
    [rows.length, requestMore],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <label className="relative mx-4 mt-4 mb-3 block shrink-0">
        <span className="sr-only">Search My Day</span>
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search authorized events"
          className="pl-9"
        />
      </label>
      {incomplete ? (
        <div role="status" className="mx-4 mb-3 shrink-0 rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-2 text-xs text-status-warning-ink">
          Some calendar sources are incomplete. Search results may be missing items.
        </div>
      ) : null}
      {rows.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-sm text-muted-foreground">
          {hasMore ? (
            <CalendarLoadingStatus label="Searching more calendar items…" />
          ) : (
            "No matching items in this day."
          )}
        </div>
      ) : (
        <CalendarVirtualScroll>
          <List<MyDayRowData>
            aria-label="My Day items"
            tabIndex={0}
            rowComponent={MyDayVirtualRow}
            rowCount={rows.length}
            rowHeight={rowHeight}
            rowProps={rowProps}
            rowKey={rowKey}
            defaultHeight={600}
            overscanCount={5}
            className="calendar-virtual-scroll"
            style={{ height: "100%" }}
            onRowsRendered={handleRowsRendered}
          />
        </CalendarVirtualScroll>
      )}
      {hasMore && isLoadingMore ? (
        <div className="flex shrink-0 justify-center py-1" role="status">
          <CalendarLoadingStatus label="Loading more calendar items…" />
        </div>
      ) : null}
    </div>
  );
}
