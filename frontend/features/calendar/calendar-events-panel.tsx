"use client";

import { useMemo, type CSSProperties, type Key } from "react";
import { format, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatEventTimeRange } from "@/lib/date-utils";
import { EVENT_COLORS } from "./calendar-event-constants";

interface CalendarEventsPanelProps {
  mode: "list" | "history";
  events: CalendarListItem[];
  range?: { start: Date; end: Date };
  onSelectEvent: (eventId: string) => void;
}

type PanelRow =
  | { type: "header"; dateKey: string }
  | { type: "event"; event: CalendarListItem };

interface PanelRowData {
  rows: PanelRow[];
  onSelectEvent: (eventId: string) => void;
}

const ESTIMATED_ROW_HEIGHT = 96;
const ROW_GAP_PX = 8;
const OVERSCAN_COUNT = 5;
const DEFAULT_LIST_HEIGHT = 600;

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
      <div style={style} {...ariaAttributes} className="flex items-end px-4 pt-5 pb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {format(new Date(row.dateKey), "EEEE, MMMM d, yyyy")}
        </h3>
      </div>
    );
  }

  const { event } = row;
  const color = EVENT_COLORS[event.color ?? "blue"] ?? EVENT_COLORS.blue;

  function handleSelectEvent() {
    onSelectEvent(event.id);
  }

  return (
    <div style={mergeEventRowStyle(style)} {...ariaAttributes}>
      <button
        type="button"
        aria-label={event.title}
        onClick={handleSelectEvent}
        className={cn(
          /* impeccable-disable side-tab -- Colored left border is intentional calendar event category indicator (standard pattern in Google Calendar, Outlook) */
          "w-full rounded-lg border border-l-4 bg-card p-3 text-left shadow-xs transition-colors hover:bg-muted/40 overflow-hidden min-w-0",
        )}
        style={{ borderLeftColor: color }}
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1 overflow-hidden">
            <TruncatedText
              text={event.title}
              className="text-sm font-semibold text-foreground"
            />
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {event.allDay
                ? "All day"
                : formatEventTimeRange(event.start, event.end, event.timezone)}
            </p>
            {event.location ? (
              <TruncatedText
                text={event.location}
                className="mt-1 text-dense text-muted-foreground"
              />
            ) : null}
          </div>
          <span className="shrink-0 text-micro uppercase tracking-wide text-muted-foreground whitespace-nowrap">
            {event.category}
          </span>
        </div>
      </button>
    </div>
  );
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

  if (filteredEvents.length === 0) {
    return (
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
    );
  }

  return (
    <div className="min-h-0 flex-1">
      <List<PanelRowData>
        rowComponent={PanelVirtualRow}
        rowCount={rows.length}
        rowHeight={rowHeight}
        rowProps={rowProps}
        rowKey={getPanelRowKey}
        defaultHeight={DEFAULT_LIST_HEIGHT}
        overscanCount={OVERSCAN_COUNT}
        style={{ height: "100%" }}
      />
    </div>
  );
}
