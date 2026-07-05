"use client";

import type { HeaderProps } from "react-big-calendar";

export function CalendarWeekDayHeader({ date, localizer }: HeaderProps) {
  const dayNumber = localizer.format(date, "dateFormat");
  const weekday = localizer.format(date, "weekdayFormat");

  return (
    <span
      role="columnheader"
      aria-sort="none"
      className="calendar-week-day-header flex flex-col items-center justify-center gap-0.5 leading-none"
    >
      <span className="calendar-week-day-header-date text-[13px] font-semibold">
        {dayNumber}
      </span>
      <span className="calendar-week-day-header-weekday text-[10px] font-medium">
        {weekday}
      </span>
    </span>
  );
}
