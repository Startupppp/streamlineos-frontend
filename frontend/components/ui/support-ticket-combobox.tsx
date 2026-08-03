"use client";

import { useMemo, useState, useCallback } from "react";
import { useSupportTickets, useSupportTicket } from "@/hooks/api/support";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Combobox } from "@/components/ui/combobox";

interface SupportTicketComboboxProps {
  value: string;
  onChange: (value: string) => void;
  excludeTicketId?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SupportTicketCombobox({
  value,
  onChange,
  excludeTicketId,
  placeholder = "Search tickets…",
  disabled,
  className,
}: SupportTicketComboboxProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isFetching } = useSupportTickets({ limit: 100 });
  const tickets = useMemo(() => data?.items ?? [], [data]);

  const numericLookup = /^\d+$/.test(debouncedSearch.trim())
    ? Number(debouncedSearch.trim())
    : 0;
  const { data: lookedUpTicket } = useSupportTicket(numericLookup);

  const options = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const seen = new Set<number>();
    const merged = [];

    if (
      lookedUpTicket &&
      lookedUpTicket.id !== excludeTicketId &&
      (!q ||
        String(lookedUpTicket.id).includes(q) ||
        lookedUpTicket.title.toLowerCase().includes(q))
    ) {
      merged.push(lookedUpTicket);
      seen.add(lookedUpTicket.id);
    }

    for (const ticket of tickets) {
      if (ticket.id === excludeTicketId || seen.has(ticket.id)) continue;
      if (
        q &&
        !String(ticket.id).includes(q) &&
        !ticket.title.toLowerCase().includes(q)
      ) {
        continue;
      }
      merged.push(ticket);
      seen.add(ticket.id);
    }

    return merged.slice(0, 50).map((ticket) => ({
      value: String(ticket.id),
      label: `#${ticket.id} · ${ticket.title}`,
      sublabel: ticket.status.replace("_", " "),
    }));
  }, [tickets, debouncedSearch, lookedUpTicket, excludeTicketId]);

  const handleSearchChange = useCallback((q: string) => {
    setSearch(q);
  }, []);

  const emptyText = isFetching ? "Loading tickets…" : "No tickets found.";

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search by # or title…"
      emptyText={emptyText}
      disabled={disabled}
      className={className}
      onSearchChange={handleSearchChange}
    />
  );
}
