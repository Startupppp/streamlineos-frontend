"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import {
  CHAT_INBOX_FILTERS,
  chatInboxFilterLabel,
  type ChatInboxFilter,
} from "./chat-inbox-filter";

interface ChannelInboxFilterProps {
  value: ChatInboxFilter;
  unreadCount: number;
  onChange: (filter: ChatInboxFilter) => void;
}

function nextFilter(current: ChatInboxFilter, direction: 1 | -1): ChatInboxFilter {
  const index = CHAT_INBOX_FILTERS.indexOf(current);
  const count = CHAT_INBOX_FILTERS.length;
  return CHAT_INBOX_FILTERS[(index + direction + count) % count];
}

export function ChannelInboxFilter({
  value,
  unreadCount,
  onChange,
}: ChannelInboxFilterProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group?.contains(document.activeElement)) return;
    group.querySelector<HTMLElement>("[aria-checked='true']")?.focus();
  }, [value]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        onChange(nextFilter(value, 1));
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        onChange(nextFilter(value, -1));
      }
    },
    [onChange, value],
  );

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Conversation filter"
      className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onKeyDown={handleKeyDown}
    >
      {CHAT_INBOX_FILTERS.map((filter) => (
        <InboxFilterOption
          key={filter}
          filter={filter}
          selected={value === filter}
          count={filter === "unread" ? unreadCount : 0}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function InboxFilterOption({
  filter,
  selected,
  count,
  onChange,
}: {
  filter: ChatInboxFilter;
  selected: boolean;
  count: number;
  onChange: (filter: ChatInboxFilter) => void;
}) {
  const handleSelect = useCallback(() => onChange(filter), [filter, onChange]);
  const label = chatInboxFilterLabel(filter);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={handleSelect}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium leading-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
      {count > 0 ? (
        <span className="font-mono text-dense tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
