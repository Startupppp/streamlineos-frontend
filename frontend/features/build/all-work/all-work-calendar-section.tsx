"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { AllWorkTicket } from "@/types/projects";

interface AllWorkCalendarSectionProps {
  tickets: AllWorkTicket[];
  hasMore: boolean;
}

interface DayBucket {
  dateKey: string;
  tickets: AllWorkTicket[];
}

export function AllWorkCalendarSection({ tickets, hasMore }: AllWorkCalendarSectionProps) {
  const buckets = useMemo((): DayBucket[] => {
    const map = new Map<string, AllWorkTicket[]>();
    for (const ticket of tickets) {
      const key = ticket.dueDate ? ticket.dueDate.slice(0, 10) : null;
      if (!key) continue;
      const existing = map.get(key);
      if (existing) existing.push(ticket);
      else map.set(key, [ticket]);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, ts]) => ({ dateKey, tickets: ts }));
  }, [tickets]);

  if (buckets.length === 0) {
    return (
      <EmptyState
        illustration={<CalendarDays />}
        title="No due dates set"
        description="Tickets with due dates will appear here grouped by day."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {hasMore && (
        <p className="text-xs text-muted-foreground">
          Showing due dates for the current page only. Use pagination to see more.
        </p>
      )}
      {buckets.map(({ dateKey, tickets: dayTickets }) => {
        const label = format(parseISO(dateKey), "EEEE, MMMM d, yyyy");
        return (
          <div key={dateKey} className="flex flex-col gap-2">
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
            <div className="flex flex-col gap-1 rounded-xl border p-3">
              {dayTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/50",
                  )}
                >
                  <span className="font-mono tabular-nums text-muted-foreground text-xs shrink-0">
                    {ticket.projectKey ? `${ticket.projectKey}-${ticket.ticketNumber}` : `#${ticket.ticketNumber}`}
                  </span>
                  <span className="flex-1 truncate">{ticket.title}</span>
                  {ticket.projectName && (
                    <span className="shrink-0 text-xs text-muted-foreground">{ticket.projectName}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
