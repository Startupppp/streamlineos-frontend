"use client";

import { format } from "date-fns";
import { enIN } from "date-fns/locale/en-IN";
import type { HeaderProps } from "react-big-calendar";

export function CalendarDayHeader({ date }: HeaderProps) {
  const label = format(date, "EEEE, MMMM d", { locale: enIN });

  return (
    <span className="calendar-day-header text-label font-semibold leading-none whitespace-nowrap">
      {label}
    </span>
  );
}
