"use client";

import { useState, useCallback } from "react";
import { format, parseISO, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fromDate?: Date;
  toDate?: Date;
  fromYear?: number;
  toYear?: number;
  id?: string;
  disabledDays?: (date: Date) => boolean;
  dateFormat?: string;
}

function parseDateValue(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  fromDate,
  toDate,
  fromYear = 1950,
  toYear = new Date().getFullYear() + 5,
  id,
  disabledDays,
  dateFormat = "PPP",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        onChange(format(date, "yyyy-MM-dd"));
        setOpen(false);
      }
    },
    [onChange]
  );

  const handleOpenChange = useCallback((o: boolean) => setOpen(o), []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            FIELD_CONTROL_CLASS,
            "w-full min-w-0 justify-start gap-2 px-3 text-left font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {selected ? format(selected, dateFormat) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          fromDate={fromDate}
          toDate={toDate}
          fromYear={fromYear}
          toYear={toYear}
          initialFocus
          disabled={disabledDays}
        />
      </PopoverContent>
    </Popover>
  );
}
