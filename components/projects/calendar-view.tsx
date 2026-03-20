"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  priority?: string;
  dueDate?: string | null;
  startDate?: string | null;
  ticketNumber: number;
  sequenceId?: string | null;
}

interface CalendarViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
}

const statusColors: Record<string, string> = {
  TODO: "bg-gray-400",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW: "bg-purple-500",
  DONE: "bg-green-500",
};

export function CalendarView({ tickets, onTicketClick }: CalendarViewProps) {
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
      const key = new Date(date).toISOString().split("T")[0];
      const existing = map.get(key) ?? [];
      existing.push(t);
      map.set(key, existing);
    });
    return map;
  }, [tickets]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date().toISOString().split("T")[0];

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {currentDate.toLocaleString("en-US", { month: "long", year: "numeric" })}
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border rounded-lg overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center bg-muted/50 border-b">
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
                {dayTickets.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onTicketClick(t.id)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-left hover:bg-muted transition-colors"
                  >
                    <div className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", statusColors[t.status] ?? "bg-gray-400")} />
                    <span className="text-[10px] text-foreground truncate">{t.title}</span>
                  </button>
                ))}
                {dayTickets.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1.5">+{dayTickets.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
