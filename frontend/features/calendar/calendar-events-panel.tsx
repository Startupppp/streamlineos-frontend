"use client";

import { useMemo, useCallback, type Key } from "react";
import { format, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { List, type RowComponentProps } from "react-window";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { TruncatedText } from "@/components/ui/truncated-text";
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

const HEADER_ROW_HEIGHT = 40;
const EVENT_ROW_HEIGHT_BASE = 72;
const EVENT_ROW_HEIGHT_LOCATION = 92;
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

function getPanelRowHeight(index: number, data: PanelRowData): number {
  const row = data.rows[index];
  if (!row) return EVENT_ROW_HEIGHT_BASE;
  if (row.type === "header") return HEADER_ROW_HEIGHT;
  return row.event.location ? EVENT_ROW_HEIGHT_LOCATION : EVENT_ROW_HEIGHT_BASE;
}

function getPanelRowKey(index: number, data: PanelRowData): Key {
  const row = data.rows[index];
  if (!row) return index;
  if (row.type === "header") return `hdr:${row.dateKey}`;
  return `evt:${row.event.id}`;
}

function PanelVirtualRow({
  index,
  style,
  ariaAttributes,
  rows,
  onSelectEvent,
}: RowComponentProps<PanelRowData>) {
  const row = rows[index];
  if (!row) return <div style={style} />;

  if (row.type === "header") {
    return (
      <div style={style} className="flex items-end px-4 pb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {format(new Date(row.dateKey), "EEEE, MMMM d, yyyy")}
        </h3>
      </div>
    );
  }

  const { event } = row;
  const color = EVENT_COLORS[event.color ?? "blue"] ?? EVENT_COLORS.blue;
  const start = new Date(event.start);
  const end = new Date(event.end);

  return (
    <div style={{ ...style, paddingLeft: 16, paddingRight: 16, paddingBottom: 8 }} {...ariaAttributes}>
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

  const stableRowKey = useCallback(getPanelRowKey, []);
  const stableRowHeight = useCallback(getPanelRowHeight, []);

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
        rowHeight={stableRowHeight}
        rowProps={rowProps}
        rowKey={stableRowKey}
        defaultHeight={DEFAULT_LIST_HEIGHT}
        overscanCount={OVERSCAN_COUNT}
        style={{ height: "100%" }}
      />
    </div>
  );
}
