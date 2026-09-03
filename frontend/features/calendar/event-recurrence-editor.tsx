"use client";

import { useCallback } from "react";
import { Repeat } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import {
  type RecurrenceState,
  type WeekDay,
  WEEKDAYS,
  WEEKDAY_LABELS,
  BYSETPOS_LABELS,
  buildRrule,
} from "./event-recurrence-schema";

interface RecurrenceEditorProps {
  state: RecurrenceState;
  onChange: (next: RecurrenceState) => void;
  startDate?: string;
}

const FREQ_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

const BYSETPOS_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
  { value: 4, label: "Fourth" },
  { value: -1, label: "Last" },
];

export function RecurrenceEditor({ state, onChange, startDate }: RecurrenceEditorProps) {
  const set = useCallback(
    <K extends keyof RecurrenceState>(key: K, value: RecurrenceState[K]) => {
      onChange({ ...state, [key]: value });
    },
    [state, onChange],
  );

  const handleFreqChange = useCallback(
    (value: string) => {
      const freq = value as RecurrenceState["freq"];
      const next: RecurrenceState = { ...state, freq };
      if (freq === "WEEKLY" && next.byDay.length === 0) {
        next.byDay = ["MO"];
      }
      onChange(next);
    },
    [state, onChange],
  );

  const handleIntervalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10);
      if (!Number.isNaN(v) && v >= 1 && v <= 99) set("interval", v);
    },
    [set],
  );

  const toggleDay = useCallback(
    (day: WeekDay) => {
      const next = state.byDay.includes(day)
        ? state.byDay.filter((d) => d !== day)
        : [...state.byDay, day];
      set("byDay", next.length > 0 ? next : [day]);
    },
    [state.byDay, set],
  );

  const handleCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10);
      if (!Number.isNaN(v) && v >= 1 && v <= 999) set("count", v);
    },
    [set],
  );

  const handleUntilChange = useCallback(
    (v: string) => set("until", v),
    [set],
  );

  const handleMonthlyModeChange = useCallback(
    (v: string) => set("monthlyMode", v as RecurrenceState["monthlyMode"]),
    [set],
  );

  const handleBySetPosChange = useCallback(
    (v: string) => set("bySetPos", parseInt(v, 10)),
    [set],
  );

  const handleByDayForMonthly = useCallback(
    (v: string) => set("byDay", [v as WeekDay]),
    [set],
  );

  const handleEndTypeChange = useCallback(
    (v: string) => set("endType", v as RecurrenceState["endType"]),
    [set],
  );

  const freqLabel = state.freq === "DAILY" ? "day" : state.freq === "WEEKLY" ? "week" : state.freq === "MONTHLY" ? "month" : "year";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5">
        <Repeat className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <Select value={state.freq} onValueChange={handleFreqChange}>
            <SelectTrigger className="w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQ_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {state.freq !== "none" && (
        <div className="pl-6 space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Every</Label>
            <Input
              type="number"
              min={1}
              max={99}
              value={state.interval}
              onChange={handleIntervalChange}
              className="w-16 text-xs h-7 px-2"
            />
            <span className="text-xs text-muted-foreground">{freqLabel}(s)</span>
          </div>

          {state.freq === "WEEKLY" && (
            <div className="flex flex-wrap gap-1">
              {WEEKDAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "h-6 w-9 rounded text-micro font-medium border transition-colors",
                    state.byDay.includes(day)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/40",
                  )}
                >
                  {WEEKDAY_LABELS[day]}
                </button>
              ))}
            </div>
          )}

          {state.freq === "MONTHLY" && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Select value={state.monthlyMode} onValueChange={handleMonthlyModeChange}>
                  <SelectTrigger className="text-xs h-7 w-fit min-w-[9rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bymonthday" className="text-xs">
                      Day {state.byMonthDay} of month
                    </SelectItem>
                    <SelectItem value="bysetpos" className="text-xs">
                      Day of week
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {state.monthlyMode === "bysetpos" && (
                <div className="flex items-center gap-2">
                  <Select value={String(state.bySetPos)} onValueChange={handleBySetPosChange}>
                    <SelectTrigger className="text-xs h-7 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BYSETPOS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={state.byDay[0] ?? "MO"}
                    onValueChange={handleByDayForMonthly}
                  >
                    <SelectTrigger className="text-xs h-7 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((day) => (
                        <SelectItem key={day} value={day} className="text-xs">
                          {WEEKDAY_LABELS[day]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ends</Label>
            <div className="space-y-1">
              {(["never", "count", "until"] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="rrule-end"
                    value={type}
                    checked={state.endType === type}
                    onChange={() => handleEndTypeChange(type)}
                    className="accent-primary"
                  />
                  {type === "never" && <span>Never</span>}
                  {type === "count" && (
                    <span className="flex items-center gap-1.5">
                      After
                      {state.endType === "count" && (
                        <Input
                          type="number"
                          min={1}
                          max={999}
                          value={state.count}
                          onChange={handleCountChange}
                          className="w-14 h-6 text-xs px-1.5"
                        />
                      )}
                      occurrences
                    </span>
                  )}
                  {type === "until" && (
                    <span className="flex items-center gap-1.5">
                      On
                      {state.endType === "until" && (
                        <DatePicker
                          value={state.until}
                          onChange={handleUntilChange}
                          placeholder="Pick date"
                          className="h-6 text-xs"
                        />
                      )}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

