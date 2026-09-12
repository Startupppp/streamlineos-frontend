"use client";

import { useCallback, type ReactNode } from "react";
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
  type RruleEndType,
  type WeekDay,
  WEEKDAYS,
  WEEKDAY_LABELS,
  BYSETPOS_LABELS,
  RECURRENCE_FREQ_OPTIONS,
  MONTHLY_MODES,
  RRULE_END_TYPES,
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


interface WeekDayToggleProps {
  day: WeekDay;
  label: string;
  isSelected: boolean;
  onToggle: (day: WeekDay) => void;
}

function WeekDayToggle({ day, label, isSelected, onToggle }: WeekDayToggleProps) {
  const handleClick = useCallback(() => onToggle(day), [day, onToggle]);
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSelected}
      className={cn(
        "h-6 w-9 rounded text-micro font-medium border transition-colors",
        isSelected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent text-muted-foreground border-border hover:border-primary/40",
      )}
    >
      {label}
    </button>
  );
}

interface EndTypeOptionProps {
  type: RruleEndType;
  isSelected: boolean;
  onSelect: (type: RruleEndType) => void;
  children: ReactNode;
}

function EndTypeOption({ type, isSelected, onSelect, children }: EndTypeOptionProps) {
  const handleChange = useCallback(() => onSelect(type), [type, onSelect]);
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer">
      <input
        type="radio"
        name="rrule-end"
        value={type}
        checked={isSelected}
        onChange={handleChange}
        className="accent-primary"
      />
      {children}
    </label>
  );
}

export function RecurrenceEditor({ state, onChange, startDate }: RecurrenceEditorProps) {
  const set = useCallback(
    <K extends keyof RecurrenceState>(key: K, value: RecurrenceState[K]) => {
      onChange({ ...state, [key]: value });
    },
    [state, onChange],
  );

  const handleFreqChange = useCallback(
    (value: string) => {
      const freq = RECURRENCE_FREQ_OPTIONS.find((candidate) => candidate === value);
      if (!freq) return;
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
    (v: string) => {
      const mode = MONTHLY_MODES.find((candidate) => candidate === v);
      if (mode) set("monthlyMode", mode);
    },
    [set],
  );

  const handleBySetPosChange = useCallback(
    (v: string) => set("bySetPos", parseInt(v, 10)),
    [set],
  );

  const handleByDayForMonthly = useCallback(
    (v: string) => {
      const day = WEEKDAYS.find((candidate) => candidate === v);
      if (day) set("byDay", [day]);
    },
    [set],
  );

  const handleEndTypeChange = useCallback(
    (endType: RruleEndType) => set("endType", endType),
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
              className="w-16 text-xs px-2"
            />
            <span className="text-xs text-muted-foreground">{freqLabel}(s)</span>
          </div>

          {state.freq === "WEEKLY" && (
            <div className="flex flex-wrap gap-1">
              {WEEKDAYS.map((day) => (
                <WeekDayToggle
                  key={day}
                  day={day}
                  label={WEEKDAY_LABELS[day]}
                  isSelected={state.byDay.includes(day)}
                  onToggle={toggleDay}
                />
              ))}
            </div>
          )}

          {state.freq === "MONTHLY" && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Select value={state.monthlyMode} onValueChange={handleMonthlyModeChange}>
                  <SelectTrigger className="text-xs w-fit min-w-[9rem]">
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
                    <SelectTrigger className="text-xs w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BYSETPOS_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={state.byDay[0] ?? "MO"}
                    onValueChange={handleByDayForMonthly}
                  >
                    <SelectTrigger className="text-xs w-24">
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
              {RRULE_END_TYPES.map((type) => (
                <EndTypeOption
                  key={type}
                  type={type}
                  isSelected={state.endType === type}
                  onSelect={handleEndTypeChange}
                >
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
                          className="w-14 text-xs px-1.5"
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
                          className="text-xs"
                        />
                      )}
                    </span>
                  )}
                </EndTypeOption>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

