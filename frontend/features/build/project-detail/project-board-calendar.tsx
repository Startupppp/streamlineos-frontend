"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Calendar } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface CalendarTicket {
  id: number;
  title: string;
  dueDate: string | null;
  key: string;
}

interface ProjectBoardCalendarProps {
  tickets: CalendarTicket[];
  projectId: number;
}

interface TicketsByDate {
  [date: string]: CalendarTicket[];
}

export function ProjectBoardCalendar({ tickets }: ProjectBoardCalendarProps) {
  const ticketsByDate = useMemo((): TicketsByDate => {
    const result: TicketsByDate = {};
    for (const ticket of tickets) {
      if (!ticket.dueDate) continue;
      const dateKey = ticket.dueDate.slice(0, 10);
      if (!result[dateKey]) result[dateKey] = [];
      result[dateKey].push(ticket);
    }
    return result;
  }, [tickets]);

  const sortedDates = useMemo(
    () => Object.keys(ticketsByDate).sort(),
    [ticketsByDate],
  );

  if (sortedDates.length === 0) {
    return (
      <EmptyState
        illustration={<Calendar />}
        title="No due dates set"
        description="Tickets with due dates will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {sortedDates.map((dateKey) => {
        const dateTickets = ticketsByDate[dateKey];
        const label = format(parseISO(dateKey), "MMMM d, yyyy");
        return (
          <div key={dateKey} className="flex flex-col gap-2">
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
            <div className="flex flex-col gap-1 rounded-xl border p-3">
              {dateTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/50"
                >
                  <span className="font-mono tabular-nums text-muted-foreground text-xs">
                    {ticket.key}
                  </span>
                  <span className="flex-1 truncate">{ticket.title}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
