"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

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
    <div className={FILTER_TOOLBAR_ROW}>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-from`} className="text-[11px] font-medium text-muted-foreground leading-none">
          From
        </label>
        <DatePicker
          id={`${idPrefix}-from`}
          value={from}
          onChange={onFromChange}
          placeholder="Start date"
          className="w-[140px]"
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
          className="w-[140px]"
        />
      </div>
    </div>
  );
}
