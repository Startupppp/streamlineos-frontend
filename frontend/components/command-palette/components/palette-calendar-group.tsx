"use client";

import { useMemo, useState } from "react";
import { addDays, format, startOfDay, subDays } from "date-fns";
import { ArrowRight, CalendarDays } from "lucide-react";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { useCalendarSearch } from "@/hooks/api/calendar-search";
import type { CalendarListItem } from "@/hooks/api/calendar-types";
import {
  COMMAND_ARROW_CLASS,
  COMMAND_GROUP_CLASS,
  COMMAND_ITEM_CLASS,
  ItemIcon,
} from "./palette-item";

const CALENDAR_SEARCH_MIN_LENGTH = 2;
const CALENDAR_SEARCH_RESULTS = 8;

function calendarEventHref(event: CalendarListItem): string {
  const params = new URLSearchParams({ mode: "list", date: format(new Date(event.start), "yyyy-MM-dd") });
  if (event.sourceKey === "calendar-events") {
    params.set("event", event.id);
    params.set("eventSource", "calendar");
  }
  return `/calendar?${params.toString()}`;
}

function PaletteCalendarRow({
  event,
  onSelect,
}: {
  event: CalendarListItem;
  onSelect: (href: string) => void;
}) {
  function handleSelect() {
    onSelect(calendarEventHref(event));
  }

  return (
    <CommandItem
      value={`calendar ${event.title} ${event.id}`}
      onSelect={handleSelect}
      className={COMMAND_ITEM_CLASS}
    >
      <ItemIcon icon={CalendarDays} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight text-foreground">{event.title}</p>
        <p className="mt-0.5 truncate text-dense leading-tight text-muted-foreground">
          {format(new Date(event.start), event.allDay ? "EEE d MMM yyyy" : "EEE d MMM yyyy, p")}
        </p>
      </div>
      <ArrowRight className={COMMAND_ARROW_CLASS} />
    </CommandItem>
  );
}

export function PaletteCalendarGroup({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (href: string) => void;
}) {
  const [searchWindow] = useState(() => {
    const from = subDays(startOfDay(new Date()), 30);
    return { start: from.toISOString(), end: addDays(from, 120).toISOString() };
  });
  const trimmed = query.trim();
  const search = useCalendarSearch(
    { start: searchWindow.start, end: searchWindow.end, query: trimmed },
    trimmed.length >= CALENDAR_SEARCH_MIN_LENGTH,
  );
  const events = useMemo(
    () => (search.data?.pages[0]?.events ?? []).slice(0, CALENDAR_SEARCH_RESULTS),
    [search.data],
  );

  if (trimmed.length < CALENDAR_SEARCH_MIN_LENGTH || events.length === 0) return null;

  return (
    <CommandGroup heading="Calendar events" className={COMMAND_GROUP_CLASS}>
      {events.map((event) => (
        <PaletteCalendarRow key={`${event.sourceKey}:${event.occurrenceId}`} event={event} onSelect={onSelect} />
      ))}
    </CommandGroup>
  );
}
