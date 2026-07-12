"use client";

import { DatePicker } from "@/components/ui/date-picker";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  idPrefix?: string;
}

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  idPrefix = "dr",
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-from`} className="text-[11px] font-medium text-muted-foreground leading-none">
          From
        </label>
        <DatePicker
          id={`${idPrefix}-from`}
          value={from}
          onChange={onFromChange}
          placeholder="Start date"
          className="h-8 w-[140px] text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-to`} className="text-[11px] font-medium text-muted-foreground leading-none">
          To
        </label>
        <DatePicker
          id={`${idPrefix}-to`}
          value={to}
          onChange={onToChange}
          placeholder="End date"
          className="h-8 w-[140px] text-sm"
        />
      </div>
    </div>
  );
}
