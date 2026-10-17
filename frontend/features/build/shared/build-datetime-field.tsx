"use client";

import { useCallback } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIME_STEPS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

function splitDateTime(value: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const [date, rawTime] = value.split("T");
  return { date: date ?? "", time: (rawTime ?? "").slice(0, 5) };
}

function joinDateTime(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "09:00"}`;
}

interface BuildDateTimeFieldProps {
  value: string;
  onChange: (value: string) => void;
  dateLabel: string;
  timeLabel: string;
  clearable?: boolean;
}

export function BuildDateTimeField({
  value,
  onChange,
  dateLabel,
  timeLabel,
  clearable = false,
}: BuildDateTimeFieldProps) {
  const { date, time } = splitDateTime(value);
  const times = time && !TIME_STEPS.includes(time) ? [time, ...TIME_STEPS] : TIME_STEPS;

  const handleDateChange = useCallback(
    (nextDate: string) => {
      onChange(nextDate ? joinDateTime(nextDate, time) : "");
    },
    [onChange, time],
  );

  const handleTimeChange = useCallback(
    (nextTime: string) => {
      if (!date) return;
      onChange(joinDateTime(date, nextTime));
    },
    [date, onChange],
  );

  return (
    <div className="flex min-w-0 items-center gap-2">
      <DatePicker
        value={date}
        onChange={handleDateChange}
        ariaLabel={dateLabel}
        placeholder="Pick a date"
        clearable={clearable}
        className="min-w-0 flex-1"
      />
      <Select value={time || undefined} onValueChange={handleTimeChange} disabled={!date}>
        <SelectTrigger className="w-28 shrink-0" aria-label={timeLabel}>
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent>
          {times.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
