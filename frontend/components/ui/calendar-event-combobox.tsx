"use client";

import { useMemo, useState, useCallback } from "react";
import {
  useCalendarEvents,
  extractEventNumericId,
  type CalendarListItem,
} from "@/hooks/api/calendar";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Combobox } from "@/components/ui/combobox";

interface CalendarEventComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function eventNumericId(event: CalendarListItem): number | null {
  if (event.source !== "event") return null;
  return extractEventNumericId(event.id);
}

export function CalendarEventCombobox({
  value,
  onChange,
  placeholder = "Search events…",
  disabled,
  className,
}: CalendarEventComboboxProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const range = useMemo(() => {
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    const end = new Date();
    end.setMonth(end.getMonth() + 6);
    return { start, end };
  }, []);

  const { data: events = [], isFetching } = useCalendarEvents(range.start, range.end);

  const options = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    return events
      .filter((event) => event.source === "event")
      .filter((event) => {
        const numericId = eventNumericId(event);
        if (numericId == null) return false;
        if (!q) return true;
        return (
          String(numericId).includes(q) ||
          event.title.toLowerCase().includes(q) ||
          (event.location?.toLowerCase().includes(q) ?? false)
        );
      })
      .slice(0, 50)
      .map((event) => {
        const numericId = eventNumericId(event)!;
        return {
          value: String(numericId),
          label: event.title,
          sublabel: new Date(event.start).toLocaleDateString(),
        };
      });
  }, [events, debouncedSearch]);

  const handleSearchChange = useCallback((q: string) => {
    setSearch(q);
  }, []);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search by title or #…"
      emptyText={isFetching ? "Loading events…" : "No events found."}
      disabled={disabled}
      className={className}
      onSearchChange={handleSearchChange}
    />
  );
}
