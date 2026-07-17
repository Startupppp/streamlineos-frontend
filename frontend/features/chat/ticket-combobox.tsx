"use client";

import { useState, useCallback } from "react";
import { ChevronsUpDown } from "lucide-react";
import { CheckIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useProjectBoardTickets } from "@/hooks/api/projects";
import { cn } from "@/lib/utils";

interface TicketComboboxProps {
  projectId: number;
  value: number | null;
  onChange: (ticketId: number) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function TicketCombobox({
  projectId,
  value,
  onChange,
  disabled,
  placeholder = "Select ticket",
  className,
}: TicketComboboxProps) {
  const [open, setOpen] = useState(false);
  const enabled = projectId > 0 && !disabled;
  const { data: tickets, isLoading } = useProjectBoardTickets(projectId);

  const selected = (tickets ?? []).find((t) => t.id === value) ?? null;

  const handleSelect = useCallback(
    (ticketId: number) => {
      onChange(ticketId);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={!enabled}
          className={cn(
            "h-9 w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {selected ? (
              <>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  #{selected.ticketNumber}
                </span>
                <span className="truncate">{selected.title}</span>
              </>
            ) : (
              <span className="truncate">
                {projectId > 0 ? placeholder : "Select a project first"}
              </span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search tickets..." className="text-sm" />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              {isLoading ? "Loading tickets…" : "No tickets found."}
            </CommandEmpty>
            <CommandGroup>
              {(tickets ?? []).map((ticket) => (
                <TicketOption
                  key={ticket.id}
                  ticketId={ticket.id}
                  ticketNumber={ticket.ticketNumber}
                  title={ticket.title}
                  selected={ticket.id === value}
                  onSelect={handleSelect}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface TicketOptionProps {
  ticketId: number;
  ticketNumber?: number;
  title: string;
  selected: boolean;
  onSelect: (ticketId: number) => void;
}

function TicketOption({
  ticketId,
  ticketNumber,
  title,
  selected,
  onSelect,
}: TicketOptionProps) {
  const handleSelect = useCallback(() => onSelect(ticketId), [onSelect, ticketId]);
  return (
    <CommandItem
      value={`#${ticketNumber} ${title}`}
      onSelect={handleSelect}
      className="gap-2 text-sm"
    >
      <CheckIcon
        size={16}
        className={cn("shrink-0", selected ? "opacity-100" : "opacity-0")}
      />
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        #{ticketNumber}
      </span>
      <span className="truncate">{title}</span>
    </CommandItem>
  );
}
