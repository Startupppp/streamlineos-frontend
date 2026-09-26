"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  CHAT_INBOX_FILTERS,
  type ChatInboxFilter,
  type ChatInboxFilterCounts,
} from "./chat-inbox-filter";

const FILTER_LABELS: Record<ChatInboxFilter, string> = {
  all: "All",
  unread: "Unread",
  direct: "Direct",
  channels: "Channels",
};

interface ChatInboxFiltersProps {
  value: ChatInboxFilter;
  counts: ChatInboxFilterCounts;
  onChange: (filter: ChatInboxFilter) => void;
}

function filterCount(filter: ChatInboxFilter, counts: ChatInboxFilterCounts): number {
  if (filter === "all") return 0;
  return counts[filter];
}

export function ChatInboxFilters({ value, counts, onChange }: ChatInboxFiltersProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group?.contains(document.activeElement)) return;
    group.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }, [value]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const index = CHAT_INBOX_FILTERS.indexOf(value);
      const nextIndex =
        event.key === "ArrowRight" || event.key === "ArrowDown"
          ? index + 1
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
            ? index - 1
            : null;
      if (nextIndex === null) return;
      event.preventDefault();
      const next =
        CHAT_INBOX_FILTERS[
          (nextIndex + CHAT_INBOX_FILTERS.length) % CHAT_INBOX_FILTERS.length
        ];
      onChange(next);
    },
    [onChange, value],
  );

  return (
    <div
      role="radiogroup"
      ref={groupRef}
      aria-label="Filter conversations"
      className="flex gap-0.5 overflow-x-auto"
      onKeyDown={handleKeyDown}
    >
      {CHAT_INBOX_FILTERS.map((filter) => {
        const selected = value === filter;
        const count = filterCount(filter, counts);
        const label = FILTER_LABELS[filter];
        return (
          <FilterOption
            key={filter}
            label={label}
            count={count}
            selected={selected}
            onSelect={onChange}
            filter={filter}
          />
        );
      })}
    </div>
  );
}

function FilterOption({
  filter,
  label,
  count,
  selected,
  onSelect,
}: {
  filter: ChatInboxFilter;
  label: string;
  count: number;
  selected: boolean;
  onSelect: (filter: ChatInboxFilter) => void;
}) {
  const handleSelect = useCallback(() => onSelect(filter), [filter, onSelect]);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={handleSelect}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
      {count > 0 && (
        <span
          className={cn(
            "font-mono text-micro tabular-nums",
            selected ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
