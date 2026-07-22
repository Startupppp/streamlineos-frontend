"use client";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecurrenceRule } from "@/hooks/api/projects/recurring";

interface RecurrencePickerProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [enabled, setEnabled] = useState(value !== null);

  function handleToggle(on: boolean) {
    setEnabled(on);
    if (on) onChange({ frequency: "weekly", interval: 1 });
    else onChange(null);
  }

  function handleFrequency(frequency: RecurrenceRule["frequency"]) {
    if (!value) return;
    onChange({ ...value, frequency, daysOfWeek: undefined });
  }

  function handleInterval(e: React.ChangeEvent<HTMLInputElement>) {
    if (!value) return;
    const interval = Math.max(1, parseInt(e.target.value) || 1);
    onChange({ ...value, interval });
  }

  function toggleDay(day: number) {
    if (!value) return;
    const days = value.daysOfWeek ?? [];
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort((a, b) => a - b);
    onChange({ ...value, daysOfWeek: next });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium flex-1">Recurring</span>
        <Switch checked={enabled} onCheckedChange={handleToggle} aria-label="Toggle recurrence" />
      </div>

      {enabled && value && (
        <div className="space-y-3 pl-0 sm:pl-10">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Label className="w-14 shrink-0 text-xs text-muted-foreground">Repeat</Label>
            <Input
              type="number"
              min={1}
              max={99}
              value={value.interval}
              onChange={handleInterval}
              className="h-9 w-16 text-center text-xs touch-manipulation"
            />
            <Select value={value.frequency} onValueChange={handleFrequency}>
              <SelectTrigger className="h-9 min-w-[7rem] flex-1 touch-manipulation sm:w-28 sm:flex-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="daily" className="text-xs">day(s)</SelectItem>
                <SelectItem value="weekly" className="text-xs">week(s)</SelectItem>
                <SelectItem value="monthly" className="text-xs">month(s)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {value.frequency === "weekly" && (
            <div className="flex flex-wrap items-center gap-1.5">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "h-9 w-9 touch-manipulation rounded-lg border text-[10px] font-medium transition-all sm:h-8 sm:w-8",
                    (value.daysOfWeek ?? []).includes(i)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-muted-foreground hover:border-primary/30",
                  )}
                >
                  {day[0]}
                </button>
              ))}
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Label className="w-14 shrink-0 text-xs text-muted-foreground">End date</Label>
            <DatePicker
              value={value.endDate ?? ""}
              onChange={(v) => onChange({ ...value, endDate: v || null })}
              placeholder="Pick a date"
              className="w-full min-w-0 text-xs sm:w-36"
            />
          </div>
        </div>
      )}
    </div>
  );
}
