"use client";

import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Holiday } from "@/hooks/api/hr/holidays";
import { WEEKDAYS } from "../lib/holiday-schema";
import { HolidayItem } from "./holiday-item";

interface CalendarViewProps {
  holidays: Holiday[];
  viewDate: Date;
  canManage: boolean;
  onPrev: () => void;
  onNext: () => void;
  onEdit: (h: Holiday) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function CalendarView({ holidays, viewDate, canManage, onPrev, onNext, onEdit, onDelete, onAdd }: CalendarViewProps) {
  const monthHolidays = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    return holidays.filter((h) => {
      const d = parseISO(h.date);
      return d >= start && d <= end;
    });
  }, [holidays, viewDate]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    return { days: eachDayOfInterval({ start, end }), startPad: getDay(start) };
  }, [viewDate]);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <AnimatedIconButton icon={ChevronLeftIcon} variant="ghost" size="icon" iconSize={16} aria-label="Previous month" onClick={onPrev} />
          <h2 className="text-lg font-semibold text-foreground">{format(viewDate, "MMMM yyyy")}</h2>
          <AnimatedIconButton icon={ChevronRightIcon} variant="ghost" size="icon" iconSize={16} aria-label="Next month" onClick={onNext} />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
          {Array.from({ length: calendarDays.startPad }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {calendarDays.days.map((day) => {
            const dayHolidays = holidays.filter((h) => isSameDay(parseISO(h.date), day));
            const isHoliday = dayHolidays.length > 0;
            return (
              <div
                key={day.toISOString()}
                className={`relative flex flex-col items-center justify-start rounded-md p-1.5 min-h-[40px] text-sm ${
                  isHoliday ? "bg-primary/5 border border-primary/20" : "hover:bg-muted"
                }`}
                title={isHoliday ? dayHolidays.map((h) => h.name).join(", ") : undefined}
              >
                <span className={`font-medium ${isHoliday ? "text-primary" : "text-foreground"}`}>
                  {format(day, "d")}
                </span>
                {isHoliday && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayHolidays.slice(0, 2).map((_, idx) => (
                      <span key={idx} className="w-1.5 h-1.5 rounded-full bg-primary" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {format(viewDate, "MMMM")} Holidays
        </h3>
        {monthHolidays.length === 0 ? (
          <EmptyState
            illustrationPreset="calendar"
            illustrationSize="md"
            title={`No holidays in ${format(viewDate, "MMMM")}`}
            action={canManage ? { label: "Add one", onClick: onAdd } : undefined}
            compact
            className="rounded-lg border border-border bg-muted/20 py-8"
          />
        ) : (
          monthHolidays.map((h) => (
            <HolidayItem
              key={h.id}
              holiday={h}
              canManage={canManage}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
