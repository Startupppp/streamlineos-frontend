"use client";

import { isValid, parseISO } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function datePart(value: string): string {
  return value.slice(0, 10);
}

function timePart(value: string): string {
  return value.slice(11, 16) || "00:00";
}

function withDate(value: string, date: string): string {
  return `${date}T${timePart(value)}`;
}

function withTime(value: string, time: string): string {
  return `${datePart(value)}T${time}`;
}

interface CapacityWindowFieldsProps {
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

export function CapacityWindowFields({
  start,
  end,
  onStartChange,
  onEndChange,
}: CapacityWindowFieldsProps) {
  const startDay = parseISO(datePart(start));

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="capacity-start">Start</Label>
        <DatePicker
          id="capacity-start"
          value={datePart(start)}
          onChange={(date) => onStartChange(withDate(start, date))}
          ariaLabel="Start date"
        />
        <Input
          id="capacity-start-time"
          type="time"
          aria-label="Start time"
          value={timePart(start)}
          onChange={(event) => onStartChange(withTime(start, event.target.value))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="capacity-end">End</Label>
        <DatePicker
          id="capacity-end"
          value={datePart(end)}
          onChange={(date) => onEndChange(withDate(end, date))}
          fromDate={isValid(startDay) ? startDay : undefined}
          ariaLabel="End date"
        />
        <Input
          id="capacity-end-time"
          type="time"
          aria-label="End time"
          value={timePart(end)}
          onChange={(event) => onEndChange(withTime(end, event.target.value))}
        />
      </div>
    </div>
  );
}
