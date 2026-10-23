"use client";

import { useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CHAT_INBOX_FILTERS,
  chatInboxFilterLabel,
  readChatInboxFilter,
  type ChatInboxFilter,
  type ChatInboxFilterCounts,
} from "./chat-inbox-filter";

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
  const handleValueChange = useCallback(
    (next: string) => onChange(readChatInboxFilter(next)),
    [onChange],
  );

  return (
    <div className="min-w-0 w-full overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Tabs
        value={value}
        onValueChange={handleValueChange}
        className="w-max max-w-none gap-0"
      >
        <TabsList
          aria-label="Filter conversations"
          className="w-max max-w-none overflow-x-visible md:w-fit"
        >
          {CHAT_INBOX_FILTERS.map((filter) => {
            const count = filterCount(filter, counts);
            return (
              <TabsTrigger
                key={filter}
                value={filter}
                aria-controls={undefined}
                className="flex-none shrink-0 px-2.5"
              >
                {chatInboxFilterLabel(filter)}
                {count > 0 ? (
                  <span className="font-mono text-micro tabular-nums">
                    {count > 99 ? "99+" : count}
                  </span>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
