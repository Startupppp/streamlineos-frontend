"use client";

import { useState, useMemo, useCallback } from "react";
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

export interface EmployeeAssignOption {
  id: string;
  name: string;
}

interface EmployeeAssignComboboxProps {
  employees: EmployeeAssignOption[];
  value: string;
  onValueChange: (userId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function EmployeeAssignCombobox({
  employees,
  value,
  onValueChange,
  placeholder = "Unassigned",
  disabled = false,
  className,
}: EmployeeAssignComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => employees.find((e) => e.id === value),
    [employees, value],
  );

  const handleSelect = useCallback(
    (id: string) => {
      onValueChange(id);
      setOpen(false);
    },
    [onValueChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Assign to employee"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal border-input data-[placeholder]:text-muted-foreground",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selected ? selected.name : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name…" className="h-9" />
          <CommandList>
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Unassigned none clear"
                onSelect={() => handleSelect("")}
              >
                <Check className={cn("mr-2 h-4 w-4 shrink-0", value === "" ? "opacity-100" : "opacity-0")} />
                Unassigned
              </CommandItem>
              {employees.map((emp) => (
                <CommandItem
                  key={emp.id}
                  value={`${emp.name} ${emp.id}`}
                  onSelect={() => handleSelect(emp.id)}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4 shrink-0", value === emp.id ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">{emp.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
