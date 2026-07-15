"use client";

import { useMemo, useState, useCallback } from "react";
import { useChatChannels, useChatChannel } from "@/hooks/api/chat";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Combobox } from "@/components/ui/combobox";

interface ChatChannelComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ChatChannelCombobox({
  value,
  onChange,
  placeholder = "Search channels…",
  disabled,
  className,
}: ChatChannelComboboxProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: channels = [], isFetching } = useChatChannels();
  const numericLookup =
    /^\d+$/.test(debouncedSearch.trim()) ? Number(debouncedSearch.trim()) : 0;
  const { data: lookedUpChannel } = useChatChannel(numericLookup);

  const options = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const seen = new Set<number>();
    const merged = [];

    if (
      lookedUpChannel &&
      !lookedUpChannel.isArchived &&
      (!q ||
        String(lookedUpChannel.id).includes(q) ||
        lookedUpChannel.name.toLowerCase().includes(q))
    ) {
      merged.push(lookedUpChannel);
      seen.add(lookedUpChannel.id);
    }

    for (const channel of channels) {
      if (channel.isArchived || seen.has(channel.id)) continue;
      if (
        q &&
        !String(channel.id).includes(q) &&
        !channel.name.toLowerCase().includes(q)
      ) {
        continue;
      }
      merged.push(channel);
      seen.add(channel.id);
    }

    return merged.slice(0, 50).map((channel) => ({
      value: String(channel.id),
      label: channel.name,
      sublabel: channel.type.replace("_", " "),
    }));
  }, [channels, debouncedSearch, lookedUpChannel]);

  const handleSearchChange = useCallback((q: string) => {
    setSearch(q);
  }, []);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search by name or #…"
      emptyText={isFetching ? "Loading channels…" : "No channels found."}
      disabled={disabled}
      className={className}
      onSearchChange={handleSearchChange}
    />
  );
}
