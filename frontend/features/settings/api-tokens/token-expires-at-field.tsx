"use client";

import { useCallback, useMemo, type ChangeEvent } from "react";
import { addDays } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { startOfLocalDay } from "@/lib/date-constraints";

function splitDateTime(value: string): { date: string; time: string } {
  if (!value) return { date: "", time: "23:59" };
  if (!value.includes("T")) {
    return { date: value.slice(0, 10), time: "23:59" };
  }
  const [date = "", timePart = "23:59"] = value.split("T");
  return { date, time: timePart.slice(0, 5) || "23:59" };
}

function joinDateTime(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "23:59"}`;
}

interface TokenExpiresAtFieldProps {
  value: string;
  onChange: (value: string) => void;
  maxDays: number;
  id?: string;
}

export function TokenExpiresAtField({
  value,
  onChange,
  maxDays,
  id,
}: TokenExpiresAtFieldProps) {
  const { date, time } = useMemo(() => splitDateTime(value), [value]);
  const toDate = useMemo(
    () => addDays(startOfLocalDay(), maxDays),
    [maxDays],
  );

  const handleDateChange = useCallback(
    (nextDate: string) => {
      onChange(joinDateTime(nextDate, time));
    },
    [onChange, time],
  );

  const handleTimeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(joinDateTime(date, event.target.value));
    },
    [onChange, date],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DatePicker
        id={id}
        value={date}
        onChange={handleDateChange}
        placeholder="Pick expiry date"
        disablePast
        toDate={toDate}
        dateFormat="MMM d, yyyy"
        className="min-w-0 flex-1"
      />
      <Input
        type="time"
        value={time}
        onChange={handleTimeChange}
        className="w-[7.5rem] shrink-0"
        aria-label="Expiry time"
      />
    </div>
  );
}
