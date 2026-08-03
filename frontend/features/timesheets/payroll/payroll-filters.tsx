"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import type { PayPeriod, PayrollSummaryRow } from "./types";
import type { PeriodPreset } from "./lib/period-presets";
import { getPresetRange } from "./lib/period-presets";
import { differenceInCalendarDays, parseISO } from "date-fns";

interface PayrollFiltersProps {
  payPeriod: PayPeriod;
  rows: PayrollSummaryRow[];
}

const MAX_RANGE_DAYS = 92;

export function PayrollFilters({ payPeriod, rows }: PayrollFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preset = (searchParams.get("preset") ?? "this-period") as PeriodPreset;
  const start = searchParams.get("start") ?? "";
  const end = searchParams.get("end") ?? "";
  const userId = searchParams.get("userId") ?? "all";
  const includeExported = searchParams.get("includeExported") === "true";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) params.delete(k);
        else params.set(k, v);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handlePresetChange = useCallback(
    (value: string) => {
      const p = value as PeriodPreset;
      if (p === "custom") {
        updateParams({ preset: "custom" });
        return;
      }
      const range = getPresetRange(p, payPeriod);
      updateParams({ preset: p, start: range.from, end: range.to });
    },
    [payPeriod, updateParams],
  );

  const handleDateRangeChange = useCallback(
    (range: { from: string; to: string }) => {
      if (range.from && range.to) {
        const days = differenceInCalendarDays(parseISO(range.to), parseISO(range.from));
        if (days > MAX_RANGE_DAYS) {
          return;
        }
      }
      updateParams({ preset: "custom", start: range.from || null, end: range.to || null });
    },
    [updateParams],
  );

  const handleUserChange = useCallback(
    (value: string) => updateParams({ userId: value === "all" ? null : value }),
    [updateParams],
  );

  const handleIncludeExportedChange = useCallback(
    (checked: boolean) =>
      updateParams({ includeExported: checked ? "true" : null }),
    [updateParams],
  );

  return (
    <>
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[140px]")} aria-label="Period preset">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="this-period">This Period</SelectItem>
          <SelectItem value="last-period">Last Period</SelectItem>
          <SelectItem value="this-month">This Month</SelectItem>
          <SelectItem value="last-month">Last Month</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      <DateRangePicker
        from={start}
        to={end}
        onChange={handleDateRangeChange}
        placeholder="Select dates"
      />

      <Select value={userId} onValueChange={handleUserChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[160px]")} aria-label="Filter by person">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all">All people</SelectItem>
          {rows.map((r) => (
            <SelectItem key={r.userId} value={r.userId}>
              {r.userName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <Switch
          id="include-exported"
          checked={includeExported}
          onCheckedChange={handleIncludeExportedChange}
          aria-label="Include exported entries"
        />
        <Label htmlFor="include-exported" className="text-xs cursor-pointer">
          Include exported
        </Label>
      </div>
    </>
  );
}
