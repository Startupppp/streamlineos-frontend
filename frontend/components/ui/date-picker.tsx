"use client";

import { useState, useCallback, useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FIELD_CONTROL_CLASS,
  FIELD_DATE_POPOVER_CONTENT_CLASS,
} from "@/components/ui/field-control";
import {
  resolveDatePickerYearBounds,
  startOfLocalDay,
  maxDate,
  isDateOutsideBounds,
} from "@/lib/date-constraints";

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
  disablePast?: boolean;
  /** Lets an optional field return to empty. */
  clearable?: boolean;
  ariaLabel?: string;
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
  fromYear,
  toYear,
  id,
  disabledDays,
  dateFormat = "PPP",
  disablePast = false,
  clearable = false,
  ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);

  const effectiveFromDate = useMemo(() => {
    if (!disablePast) return fromDate;
    const today = startOfLocalDay();
    return maxDate(today, fromDate) ?? today;
  }, [disablePast, fromDate]);

  const yearBounds = useMemo(
    () =>
      resolveDatePickerYearBounds({
        fromDate: effectiveFromDate,
        toDate,
        fromYear,
        toYear,
      }),
    [effectiveFromDate, toDate, fromYear, toYear],
  );

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        onChange(format(date, "yyyy-MM-dd"));
        setOpen(false);
      }
    },
    [onChange],
  );

  const handleOpenChange = useCallback((o: boolean) => setOpen(o), []);
  const handleClear = useCallback(() => {
    onChange("");
  }, [onChange]);
  const isDateDisabled = useCallback(
    (date: Date) =>
      isDateOutsideBounds(date, effectiveFromDate, toDate) ||
      disabledDays?.(date) === true,
    [effectiveFromDate, toDate, disabledDays],
  );
  const hasDisabledDates =
    effectiveFromDate !== undefined ||
    toDate !== undefined ||
    disabledDays !== undefined;

  const sized = className != null && /\b(?:w-|max-w-|min-w-|flex-)/.test(className);

  return (
    <div className={cn("relative min-w-0", sized ? className : "w-full")}>
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            FIELD_CONTROL_CLASS,
            "w-full min-w-0 justify-start gap-2 px-3 text-left font-normal",
            clearable && selected && "pr-8",
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
      <PopoverContent
        className={cn(FIELD_DATE_POPOVER_CONTENT_CLASS, "p-0")}
        align="start"
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          fromDate={effectiveFromDate}
          toDate={toDate}
          fromYear={yearBounds.fromYear}
          toYear={yearBounds.toYear}
          defaultMonth={selected ?? effectiveFromDate}
          initialFocus
          disabled={hasDisabledDates ? isDateDisabled : undefined}
        />
      </PopoverContent>
    </Popover>
    {clearable && selected && !disabled ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
        aria-label={ariaLabel ? `Clear ${ariaLabel}` : "Clear date"}
        onClick={handleClear}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    ) : null}
    </div>
  );
}
