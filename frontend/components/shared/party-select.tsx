"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import {
  ResponsivePopover,
  ResponsivePopoverTrigger,
  ResponsivePopoverContent,
} from "@/components/ui/responsive-popover";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { useParties, useParty } from "@/hooks/api/party/parties";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { cn } from "@/lib/utils";

type PartyType = "CUSTOMER" | "VENDOR" | "PARTNER" | "BOTH";

interface PartySelectProps {
  value?: string | null;
  onChange: (partyId: string | null) => void;
  partyType?: PartyType;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

export function PartySelect({
  value,
  onChange,
  partyType,
  placeholder = "Select a party",
  disabled,
  allowClear = true,
  className,
}: PartySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useParties({
    partyType,
    search: debouncedSearch || undefined,
    limit: 20,
  });
  const { data: selected } = useParty(value ?? "");

  const parties = useMemo(() => data?.data ?? [], [data]);

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    const inList = parties.find((p) => p.partyId === value);
    return inList?.displayName ?? selected?.displayName ?? "Selected party";
  }, [value, parties, selected]);

  function handleSelect(partyId: string) {
    onChange(partyId);
    setOpen(false);
    setSearch("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <ResponsivePopover open={open} onOpenChange={setOpen}>
      <ResponsivePopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("h-9 w-full justify-between border-input bg-card font-normal", className)}
        >
          <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
            {selectedLabel ?? placeholder}
          </span>
          <span className="flex items-center gap-1">
            {allowClear && value ? (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleClear}
              >
                ×
              </span>
            ) : null}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </span>
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0">
        <div className="flex flex-col">
          <div className="border-b p-2">
            <SearchInput
              className="h-8"
              placeholder="Search parties…"
              value={search}
              onValueChange={setSearch}
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {isLoading ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">Loading…</p>
            ) : parties.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No parties found.
              </p>
            ) : (
              parties.map((p) => {
                const isSelected = p.partyId === value;
                return (
                  <button
                    key={p.partyId}
                    type="button"
                    onClick={() => handleSelect(p.partyId)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                      isSelected && "bg-accent",
                    )}
                  >
                    <span className="truncate">{p.displayName ?? "Unnamed party"}</span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
