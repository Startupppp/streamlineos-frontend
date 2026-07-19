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
    <>
      <DatePicker
        id={`${idPrefix}-from`}
        value={from}
        onChange={onFromChange}
        placeholder="Start date"
        className="w-[140px]"
      />
      <DatePicker
        id={`${idPrefix}-to`}
        value={to}
        onChange={onToChange}
        placeholder="End date"
        className="w-[140px]"
      />
    </>
  );
}
