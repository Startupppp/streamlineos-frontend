"use client";

import { useState, useCallback } from "react";
import { useTickets } from "@/hooks/api/build/tickets";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Combobox } from "@/components/ui/combobox";
import { formatTicketKey } from "@/components/shared/format-ticket-key";

interface TicketComboboxProps {
  projectId: number;
  projectKey: string;
  value: string;
  onChange: (value: string, label?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
}

export function TicketCombobox({
  projectId,
  projectKey,
  value,
  onChange,
  placeholder = "Search tickets…",
  disabled,
  className,
  allowClear = false,
}: TicketComboboxProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isFetching } = useTickets(
    projectId,
    debouncedSearch ? { search: debouncedSearch, limit: 20 } : { limit: 20 },
  );

  const tickets = data?.data ?? [];

  const ticketOptions = tickets.map((t) => {
    const key = formatTicketKey(projectKey, t.ticketNumber);
    return {
      value: String(t.id),
      label: `${key} · ${t.title}`,
      sublabel: t.status,
    };
  });

  const options = allowClear
    ? [{ value: "", label: "None" }, ...ticketOptions]
    : ticketOptions;

  const emptyText = isFetching ? "Searching…" : "No tickets found.";

  const handleSearchChange = useCallback((q: string) => {
    setSearch(q);
  }, []);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search by key or title…"
      emptyText={emptyText}
      disabled={disabled}
      className={className}
      onSearchChange={handleSearchChange}
    />
  );
}
