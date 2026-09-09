"use client";

import { useState, useCallback } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string, label?: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  onSearchChange?: (search: string) => void;
  /**
   * The trigger's accessible name.
   *
   * Without it the name is whatever text the trigger happens to show, which is
   * the placeholder until something is chosen — so a table rendering one of
   * these per row gives every row the identical name, and neither a screen
   * reader nor a test can tell them apart.
   */
  ariaLabel?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  disabled = false,
  className,
  onSearchChange,
  ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = onSearchChange
    ? options
    : options.filter((opt) => {
        const haystack = `${opt.label} ${opt.sublabel ?? ""}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      });

  const selected = options.find((o) => o.value === value);

  const handleSelect = useCallback(
    (v: string) => {
      const option = options.find((o) => o.value === v);
      onChange(v, option?.label);
      setOpen(false);
      setSearch("");
      onSearchChange?.("");
    },
    [onChange, onSearchChange, options],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        setSearch("");
        onSearchChange?.("");
      }
    },
    [onSearchChange],
  );

  const handleSearchInput = useCallback(
    (v: string) => {
      setSearch(v);
      onSearchChange?.(v);
    },
    [onSearchChange],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
          disabled={disabled}
          className={cn(
            FIELD_CONTROL_CLASS,
            "w-full justify-between gap-2 px-3 font-normal",
            className,
          )}
        >
          <span className="truncate text-left">
            {selected ? selected.label : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[var(--radix-popover-content-available-width)]"
        align="start"
        side="bottom"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={handleSearchInput}
          />
          <CommandList className="max-h-52 overflow-y-auto overscroll-contain scrollbar-hide">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => handleSelect(opt.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-xs text-muted-foreground truncate">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
