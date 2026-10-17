"use client";

import { useCallback, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { usePayrollCutoff } from "@/hooks/api/payroll/payroll-cutoff";
import {
  attendanceDatePresets,
  type DateRange,
  type DateRangePresetId,
} from "./attendance-date-presets";

interface AttendanceDateRangeFilterProps {
  presetId: DateRangePresetId;
  range: DateRange;
  onChange: (presetId: DateRangePresetId, range: DateRange) => void;
}

export function AttendanceDateRangeFilter({
  presetId,
  range,
  onChange,
}: AttendanceDateRangeFilterProps) {
  const { cutoff } = usePayrollCutoff();
  const presets = useMemo(() => attendanceDatePresets(cutoff), [cutoff]);

  const handlePresetChange = useCallback(
    (next: string) => {
      const preset = presets.find((candidate) => candidate.id === next);
      if (!preset) return;
      onChange(preset.id, preset.range ?? range);
    },
    [presets, onChange, range],
  );

  const handleCustomChange = useCallback(
    (next: DateRange) => {
      onChange("custom", next);
    },
    [onChange],
  );

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select value={presetId} onValueChange={handlePresetChange}>
        <SelectTrigger
          className="w-full sm:w-[150px]"
          size="sm"
          aria-label="Date range preset (IST)"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {presetId === "custom" ? (
        <DateRangePicker
          from={range.from}
          to={range.to}
          onChange={handleCustomChange}
          placeholder="Pick a date range (IST)"
          className="min-w-0 flex-1"
        />
      ) : (
        <p className="text-dense tabular-nums text-muted-foreground">
          {range.from} → {range.to} (IST)
        </p>
      )}
    </div>
  );
}
