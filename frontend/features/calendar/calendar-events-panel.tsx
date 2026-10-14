"use client";

import { useCallback, useEffect, useMemo, useRef, type CSSProperties, type Key } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatEventTimeRange } from "@/lib/date-utils";
import { EVENT_COLORS } from "./calendar-event-constants";
import { CalendarVirtualScroll } from "./calendar-virtual-scroll";
import { CalendarLoadingStatus } from "./calendar-lazy-fallbacks";
import { eventOverlapsRange } from "./use-calendar-computed";

interface CalendarEventsPanelProps {
  mode: "list" | "history";
  events: CalendarListItem[];
  range?: { start: Date; end: Date };
  onSelectEvent: (event: CalendarListItem) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  autoLoadMore?: boolean;
  onLoadMore?: () => void;
  loadedPageCount?: number;
}

type PanelRow =
  | { type: "header"; dateKey: string }
  | { type: "event"; event: CalendarListItem };

interface PanelRowData {
  rows: PanelRow[];
  onSelectEvent: (event: CalendarListItem) => void;
}

const ESTIMATED_ROW_HEIGHT = 96;
const ROW_GAP_PX = 8;
const OVERSCAN_COUNT = 5;
const DEFAULT_LIST_HEIGHT = 600;

function groupByDate(
  events: CalendarListItem[],
  mode: "list" | "history",
): Map<string, CalendarListItem[]> {
  const groups = new Map<string, CalendarListItem[]>();
  for (const event of events) {
    const key = mode === "history"
      ? event.time.kind === "date"
        ? event.time.endDate
        : format(
            new Date(Math.max(Date.parse(event.start), Date.parse(event.end) - 1)),
            "yyyy-MM-dd",
          )
      : event.time.kind === "date"
        ? event.time.startDate
        : format(new Date(event.start), "yyyy-MM-dd");
    const existing = groups.get(key);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(key, [event]);
    }
  }
  return groups;
}

function getPanelRowKey(index: number, data: PanelRowData): Key {
  const row = data.rows[index];
  if (!row) return index;
  if (row.type === "header") return `hdr:${row.dateKey}`;
  return `evt:${row.event.id}`;
}

function mergeEventRowStyle(windowStyle: CSSProperties): CSSProperties {
  return {
    ...windowStyle,
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: ROW_GAP_PX,
    boxSizing: "border-box",
  };
}

function PanelVirtualRow({
  index,
  style,
  ariaAttributes,
  rows,
  onSelectEvent,
}: RowComponentProps<PanelRowData>) {
  const row = rows[index];
  if (!row) return <div style={style} {...ariaAttributes} />;

  if (row.type === "header") {
    return (
      <div style={style} {...ariaAttributes} className="flex items-end gap-3 px-4 pt-5 pb-1">
        <h3 className="shrink-0 text-xs font-semibold text-foreground">
          {format(new Date(`${row.dateKey}T12:00:00`), "EEEE, MMMM d, yyyy")}
        </h3>
        <div className="mb-1 h-px min-w-8 flex-1 bg-border" />
      </div>
    );
  }

  const { event } = row;
  const color = EVENT_COLORS[event.color ?? "blue"] ?? EVENT_COLORS.blue;

  function handleSelectEvent() {
    onSelectEvent(event);
  }

  return (
    <div style={mergeEventRowStyle(style)} {...ariaAttributes}>
      <button
        type="button"
        aria-label={event.title}
        onClick={handleSelectEvent}
        disabled={!event.actions.view}
        className="flex w-full overflow-hidden rounded-xl border border-border bg-muted text-left transition-[background-color,border-color,box-shadow] hover:border-primary/40 hover:bg-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:border-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="w-1 shrink-0" style={{ backgroundColor: color }} />
        <span className="flex min-w-0 flex-1 items-start justify-between gap-3 p-3">
          <span className="min-w-0 flex-1">
            <TruncatedText
              text={event.title}
              className="text-sm font-medium text-foreground"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              {event.allDay
                ? "All day"
                : formatEventTimeRange(event.start, event.end, event.timezone)}
            </span>
            {event.location ? (
              <TruncatedText
                text={event.location}
                className="mt-1 text-dense text-muted-foreground"
              />
            ) : null}
          </span>
          <Badge variant="outline" className="shrink-0 capitalize">
            {event.category}
          </Badge>
        </span>
      </button>
    </div>
  );
}

export function CalendarEventsPanel({
  mode,
  events,
  range,
  onSelectEvent,
  hasMore = false,
  isLoadingMore = false,
  autoLoadMore = true,
  onLoadMore,
  loadedPageCount = 0,
}: CalendarEventsPanelProps) {
  const requestedPageRef = useRef<number | null>(null);
  const tailVisibleRef = useRef(false);
  const filteredEvents = useMemo(() => {
    const now = new Date();

    if (mode === "history") {
      return events
        .filter((e) => new Date(e.end) < now)
        .sort((a, b) =>
          Date.parse(b.end) - Date.parse(a.end) ||
          b.occurrenceId.localeCompare(a.occurrenceId),
        );
    }

    const inRange = range
      ? events.filter((event) => eventOverlapsRange(event, range))
      : events;

    return inRange.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
  }, [events, mode, range]);

  const grouped = useMemo(
    () => groupByDate(filteredEvents, mode),
    [filteredEvents, mode],
  );

  const rows = useMemo<PanelRow[]>(() => {
    const result: PanelRow[] = [];
    for (const [dateKey, dayEvents] of grouped.entries()) {
      result.push({ type: "header", dateKey });
      for (const event of dayEvents) {
        result.push({ type: "event", event });
      }
    }
    return result;
  }, [grouped]);

  const rowProps = useMemo<PanelRowData>(
    () => ({ rows, onSelectEvent }),
    [rows, onSelectEvent],
  );

  const heightKey = useMemo(
    () =>
      rows
        .map((row) => (row.type === "header" ? `hdr:${row.dateKey}` : `evt:${row.event.id}`))
        .join("|"),
    [rows],
  );

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: ESTIMATED_ROW_HEIGHT,
    key: heightKey,
  });

  const requestMore = useCallback(() => {
    if (mode !== "history" || !hasMore || isLoadingMore || !onLoadMore || requestedPageRef.current === loadedPageCount) return;
    requestedPageRef.current = loadedPageCount;
    onLoadMore();
  }, [mode, hasMore, isLoadingMore, onLoadMore, loadedPageCount]);

  const handleRowsRendered = useCallback(({ stopIndex }: { startIndex: number; stopIndex: number }) => {
    tailVisibleRef.current = stopIndex >= rows.length - 1;
    if (tailVisibleRef.current && autoLoadMore) requestMore();
  }, [rows.length, autoLoadMore, requestMore]);

  useEffect(() => {
    if (autoLoadMore && (filteredEvents.length === 0 || tailVisibleRef.current)) requestMore();
  }, [autoLoadMore, filteredEvents.length, loadedPageCount, requestMore]);

  const loadOlderControl = mode === "history" && hasMore && !isLoadingMore && !autoLoadMore ? (
    <button
      type="button"
      onClick={requestMore}
      className="shrink-0 border-t border-border p-3 text-center text-sm font-medium text-primary hover:bg-muted/40"
    >
      Load older events
    </button>
  ) : null;

  if (filteredEvents.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <EmptyState
          illustrationPreset="calendar"
          title={mode === "history" ? "No past events" : "No events in this period"}
          description={
            mode === "history"
              ? "Load an older period to continue through your history."
              : "Try a different date range or add a new event."
          }
          className="min-h-0 flex-1 border-0 bg-transparent shadow-none"
        />
        {mode === "history" && isLoadingMore ? <div role="status" className="flex justify-center py-1"><CalendarLoadingStatus label="Loading older events…" /></div> : null}
        {loadOlderControl}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CalendarVirtualScroll>
        <List<PanelRowData>
          aria-label={mode === "history" ? "Calendar history events" : "Calendar list events"}
          tabIndex={0}
          rowComponent={PanelVirtualRow}
          rowCount={rows.length}
          rowHeight={rowHeight}
          rowProps={rowProps}
          rowKey={getPanelRowKey}
          defaultHeight={DEFAULT_LIST_HEIGHT}
          overscanCount={OVERSCAN_COUNT}
          className="calendar-virtual-scroll"
          style={{ height: "100%" }}
          onRowsRendered={handleRowsRendered}
        />
      </CalendarVirtualScroll>
      {mode === "history" && isLoadingMore ? <div role="status" className="flex shrink-0 justify-center py-1"><CalendarLoadingStatus label="Loading older events…" /></div> : null}
      {loadOlderControl}
    </div>
  );
}
