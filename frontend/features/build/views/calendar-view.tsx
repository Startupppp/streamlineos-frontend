"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { getStatusDotClass } from "../shared/status-badge";
import { TicketQuickActions } from "./ticket-quick-actions";
import { stopEvent } from "./card-inline-fields";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  priority?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  ticketNumber?: number;
  sequenceId?: string | null;
  assigneeId?: string | null;
  cycleId?: number | null;
  sprintId?: number | null;
  labels?: { label?: { id: number; name: string; color?: string | null } }[];
}

interface CalendarViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
}

export function CalendarView({ tickets, onTicketClick, projectId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const ticketsByDate = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    tickets.forEach((t) => {
      const date = t.dueDate || t.startDate;
      if (!date) return;
      const key = typeof date === "string" ? date.split("T")[0] : new Date(date).toISOString().split("T")[0];
      const existing = map.get(key) ?? [];
      existing.push(t);
      map.set(key, existing);
    });
    return map;
  }, [tickets]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleTodayClick = () => setCurrentDate(new Date());
  const handleMonthChange = (value: string) => setCurrentDate(new Date(year, parseInt(value), 1));
  const handleYearChange = (value: string) => setCurrentDate(new Date(parseInt(value), month, 1));

  const today = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Select value={String(month)} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <AnimatedIconButton variant="outline" size="icon" icon={ChevronLeftIcon} iconSize={16} onClick={handlePrevMonth} aria-label="Previous month" />
          <Button variant="outline" size="sm" onClick={handleTodayClick}>
            Today
          </Button>
          <AnimatedIconButton variant="outline" size="icon" icon={ChevronRightIcon} iconSize={16} onClick={handleNextMonth} aria-label="Next month" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
        <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
          <div className="overscroll-contain">
          <div className="grid grid-cols-7">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="sticky top-0 z-10 border-b bg-muted/50 px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="min-h-[100px] border-b border-r bg-muted/20" />;
              }

              const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayTickets = ticketsByDate.get(dateKey) ?? [];
              const isToday = dateKey === today;

              return (
                <div
                  key={dateKey}
                  className={cn(
                    "min-h-[100px] border-b border-r p-1",
                    isToday ? "bg-primary/5" : "bg-background"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center h-6 w-6 text-xs rounded-full mb-1",
                      isToday ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                    )}
                  >
                    {day}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {dayTickets.slice(0, 3).map((t) => {
                      return (
                        <div
                          key={t.id}
                          className="group/chip flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => onTicketClick(t.id)}
                            className="flex items-center gap-1 min-w-0 flex-1 text-left"
                          >
                            <div className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", getStatusDotClass(t.status))} />
                            <span className="text-micro text-foreground truncate">{t.title}</span>
                          </button>
                          {projectId != null && (
                            <span
                              onMouseDown={stopEvent}
                              onClick={stopEvent}
                              onKeyDown={stopEvent}
                              className="shrink-0 opacity-0 group-hover/chip:opacity-100 transition-opacity"
                            >
                              <TicketQuickActions
                                ticketId={t.id}
                                projectId={projectId}
                              />
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {dayTickets.length > 3 && (
                      <span className="text-micro text-muted-foreground px-1.5">+{dayTickets.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
