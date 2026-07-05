"use client";
import { useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";

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

export function useWeek(): WeekState {
  const [weekOffset, setWeekOffset] = useState(0);

  const { weekStart, weekEnd, days } = useMemo(() => {
    const base = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
    const ws = format(base, "yyyy-MM-dd");
    const we = format(addDays(base, 6), "yyyy-MM-dd");
    const d = Array.from({ length: 7 }, (_, i) => format(addDays(base, i), "yyyy-MM-dd"));
    return { weekStart: ws, weekEnd: we, days: d };
  }, [weekOffset]);

  const goToPrev = () => setWeekOffset((o) => o - 1);
  const goToNext = () => setWeekOffset((o) => o + 1);
  const goToCurrent = () => setWeekOffset(0);

  return { weekOffset, weekStart, weekEnd, days, isCurrentWeek: weekOffset === 0, goToPrev, goToNext, goToCurrent };
}
