"use client";
import { useCallback, useMemo, useState } from "react";
import { addDays, format, isValid, parseISO, startOfWeek } from "date-fns";

export interface WeekState {
  weekOffset: number;
  weekStart: string;
  weekEnd: string;
  days: string[];
  isCurrentWeek: boolean;
  goToPrev: () => void;
  goToNext: () => void;
  goToCurrent: () => void;
}

export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const DEFAULT_WEEK_START: WeekStartDay = 1;

function asWeekStartDay(value: number): WeekStartDay | null {
  if (!Number.isInteger(value) || value < 0 || value > 6) return null;
  return value as WeekStartDay;
}

export function resolveWeekStart(
  settingsWeekStart: number | null | undefined,
  currentPeriodStart: string | null | undefined,
): WeekStartDay {
  if (typeof settingsWeekStart === "number") {
    const fromSettings = asWeekStartDay(settingsWeekStart);
    if (fromSettings !== null) return fromSettings;
  }
  if (currentPeriodStart) {
    const parsed = parseISO(currentPeriodStart);
    if (isValid(parsed)) {
      const fromPeriod = asWeekStartDay(parsed.getDay());
      if (fromPeriod !== null) return fromPeriod;
    }
  }
  return DEFAULT_WEEK_START;
}

export function useWeek(weekStartsOn: WeekStartDay = DEFAULT_WEEK_START): WeekState {
  const [weekOffset, setWeekOffset] = useState(0);

  const { weekStart, weekEnd, days } = useMemo(() => {
    const base = addDays(startOfWeek(new Date(), { weekStartsOn }), weekOffset * 7);
    const ws = format(base, "yyyy-MM-dd");
    const we = format(addDays(base, 6), "yyyy-MM-dd");
    const d = Array.from({ length: 7 }, (_, i) => format(addDays(base, i), "yyyy-MM-dd"));
    return { weekStart: ws, weekEnd: we, days: d };
  }, [weekOffset, weekStartsOn]);

  const goToPrev = useCallback(() => setWeekOffset((o) => o - 1), []);
  const goToNext = useCallback(() => setWeekOffset((o) => o + 1), []);
  const goToCurrent = useCallback(() => setWeekOffset(0), []);

  return { weekOffset, weekStart, weekEnd, days, isCurrentWeek: weekOffset === 0, goToPrev, goToNext, goToCurrent };
}
