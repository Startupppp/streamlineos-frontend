"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Key } from "react";
import { Search } from "lucide-react";
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CalendarListItem, CalendarSearchResponse } from "@/hooks/api/calendar-types";
import { formatEventTimeRange } from "@/lib/date-utils";
import { calendarSearchIsPartial } from "./calendar-search-coverage";

type MyDayRow =
  | { type: "header"; title: string }
  | { type: "event"; event: CalendarListItem };

interface MyDayRowData {
  rows: MyDayRow[];
  onSelectEvent: (event: CalendarListItem) => void;
}

function nextAction(event: CalendarListItem): string {
  if (event.actions.complete) return "Complete";
  if (event.actions.rsvp) return "Respond";
  if (event.actions.edit) return "Edit";
  return "View";
}

function kind(event: CalendarListItem, now: number): "action" | "preparation" | "information" {
  if (event.actions.complete || event.actions.rsvp) return "action";
  if (event.category === "task" && !/complete|done|closed|cancel|resolved/i.test(event.status ?? ""))
    return "action";
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
      <div style={style} {...ariaAttributes} className="flex items-end px-4 pb-2">
        <h3 className="text-sm font-semibold">{row.title}</h3>
      </div>
    );

  const event = row.event;
  return (
    <div style={{ ...style, padding: "0 16px 8px", boxSizing: "border-box" }} {...ariaAttributes}>
      <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
        <div className="min-w-0 space-y-1">
          <div className="truncate text-sm font-medium">{event.title}</div>
          <div className="text-xs text-muted-foreground">
            {event.timeKind === "date" ? "All day" : formatEventTimeRange(event.start, event.end, event.timezone)}{" "}
            · {event.source} · {event.status ?? "Scheduled"}
          </div>
          <div className="text-xs text-muted-foreground">
            {event.freshness.state === "stale"
              ? "Source may be stale"
              : event.freshness.state === "unknown"
                ? "Source freshness unknown"
                : "Source current"}
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onSelectEvent(event)}>
          {nextAction(event)}
        </Button>
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
  const lastRequestedPageRef = useRef<CalendarSearchResponse | undefined | null>(null);
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
    if (!hasMore || isLoadingMore || lastRequestedPageRef.current === pages.at(-1)) return;
    lastRequestedPageRef.current = pages.at(-1);
    onLoadMore();
  }, [hasMore, isLoadingMore, onLoadMore, pages]);

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
        <div className="flex min-h-0 flex-1 flex-col justify-center px-4 text-sm text-muted-foreground">
          {hasMore ? "Searching more calendar items…" : "No matching items in this day."}
        </div>
      ) : (
        <div className="min-h-0 flex-1">
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
            style={{ height: "100%" }}
            onRowsRendered={handleRowsRendered}
          />
        </div>
      )}
      {hasMore ? (
        <div className="shrink-0 px-4 py-2 text-xs text-muted-foreground" role={isLoadingMore ? "status" : undefined}>
          {isLoadingMore ? "Loading more calendar items…" : null}
        </div>
      ) : null}
    </div>
  );
}
