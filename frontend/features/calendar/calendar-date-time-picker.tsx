"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const hours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));

export function CalendarDateTimePicker({
  id,
  label,
  value,
  onChange,
  disabled = false,
  clearable = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  clearable?: boolean;
}) {
  const date = value.slice(0, 10);
  const hour = value.slice(11, 13) || "00";
  const minute = value.slice(14, 16) || "00";

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_5rem_5rem] gap-2">
      <DatePicker
        id={id}
        value={date}
        onChange={(nextDate) => onChange(nextDate ? `${nextDate}T${hour}:${minute}` : "")}
        ariaLabel={`${label} date`}
        clearable={clearable}
        disabled={disabled}
      />
      <Select
        value={date ? hour : ""}
        onValueChange={(nextHour) => onChange(`${date}T${nextHour}:${minute}`)}
        disabled={disabled || !date}
      >
        <SelectTrigger aria-label={`${label} hour`} className="w-full">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select
        value={date ? minute : ""}
        onValueChange={(nextMinute) => onChange(`${date}T${hour}:${nextMinute}`)}
        disabled={disabled || !date}
      >
        <SelectTrigger aria-label={`${label} minute`} className="w-full">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
