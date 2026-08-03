"use client";

import { useState } from "react";
import { Building2, X } from "lucide-react";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { useCrmOrganizationsForPicker } from "@/hooks/api/crm";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

interface TicketCustomerPickerProps {
  customerId: number | null | undefined;
  customerName: string | null | undefined;
  onChange: (id: number | null) => void;
}

export function TicketCustomerPicker({
  customerId,
  customerName,
  onChange,
}: TicketCustomerPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data } = useCrmOrganizationsForPicker(debouncedSearch);
  const orgs = data?.organizations ?? [];

  function handleSelect(id: number) {
    onChange(customerId === id ? null : id);
    setOpen(false);
    setSearch("");
  }

  function handleClear() {
    onChange(null);
  }

  function handleNoneSelect() {
    onChange(null);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className="min-w-0">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Building2 className="mr-0.5 inline h-3 w-3" />
        Customer
      </span>
      <div className="flex min-w-0 items-center gap-1">
        <ResponsivePopover open={open} onOpenChange={setOpen}>
          <ResponsivePopoverTrigger asChild>
            <button
              type="button"
              className="flex min-h-10 min-w-0 flex-1 touch-manipulation items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-xs text-left transition-colors hover:bg-accent @[18rem]:min-h-9 md:min-h-9"
            >
              {customerName ? (
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {customerName}
                </span>
              ) : (
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  None
                </span>
              )}
            </button>
          </ResponsivePopoverTrigger>
          <ResponsivePopoverContent title="Customer" className="min-w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search customers..."
                className="h-8 text-xs"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList className="max-h-48">
                <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                  No customers found.
                </CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="__none__"
                    onSelect={handleNoneSelect}
                    className="text-xs text-muted-foreground"
                  >
                    None
                  </CommandItem>
                  {orgs.map((org) => (
                    <CommandItem
                      key={org.id}
                      value={org.name}
                      onSelect={() => handleSelect(org.id)}
                      className="text-xs"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {org.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </ResponsivePopoverContent>
        </ResponsivePopover>
        {customerId != null && (
          <button
            type="button"
            onClick={handleClear}
            className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive @[18rem]:h-9 @[18rem]:w-9 md:h-9 md:w-9"
            aria-label="Clear customer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
