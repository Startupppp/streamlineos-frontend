"use client";

import { useMemo, useState } from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useParties, useParty } from "@/hooks/api/accounting/parties";
import type { PartyRole } from "@/types/accounting-ar";

interface PartyPickerProps {
  value: string;
  onChange: (partyId: string) => void;
  role?: PartyRole;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const PICKER_PAGE_SIZE = 20;

export function PartyPicker({
  value,
  onChange,
  role = "customer",
  placeholder = "Choose a customer",
  disabled,
  className,
}: PartyPickerProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const partiesQuery = useParties({
    role,
    search: debouncedSearch || undefined,
    pageSize: PICKER_PAGE_SIZE,
  });
  const selectedQuery = useParty(value, { enabled: !!value });

  const options = useMemo<ComboboxOption[]>(() => {
    const list: ComboboxOption[] = (partiesQuery.data?.items ?? []).map((party) => ({
      value: party.id,
      label: party.displayName,
      sublabel: party.email ?? party.defaultCurrency,
    }));
    const selected = selectedQuery.data;
    if (selected && !list.some((option) => option.value === selected.id)) {
      list.unshift({
        value: selected.id,
        label: selected.displayName,
        sublabel: selected.email ?? selected.defaultCurrency,
      });
    }
    return list;
  }, [partiesQuery.data, selectedQuery.data]);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      onSearchChange={setSearch}
      placeholder={placeholder}
      searchPlaceholder="Search customers…"
      emptyText={partiesQuery.isLoading ? "Loading…" : "No customers found."}
      disabled={disabled}
      className={className}
    />
  );
}
