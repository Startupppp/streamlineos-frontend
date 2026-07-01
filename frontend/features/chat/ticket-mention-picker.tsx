"use client";

import { useCallback } from "react";
import { Loader2, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTicketSearch } from "@/hooks/api/projects";
import type { TicketSearchResult } from "@/hooks/api/projects";

interface TicketMentionPickerProps {
  query: string;
  onSelect: (ticket: TicketSearchResult) => void;
  selectedIndex: number;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
};

export function TicketMentionPicker({
  query,
  onSelect,
  selectedIndex,
  className,
}: TicketMentionPickerProps) {
  const { data: tickets = [], isLoading, isError } = useTicketSearch(query);

  const handleSelect = useCallback(
    (ticket: TicketSearchResult) => {
      onSelect(ticket);
    },
    [onSelect],
  );

  return (
    <div
      role="listbox"
      aria-label="Tickets"
      className={cn(
        "absolute bottom-full mb-1 left-0 w-80 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b text-xs font-medium text-muted-foreground">
        <Ticket className="h-3.5 w-3.5" />
        Tickets
      </div>

      <div className="max-h-52 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching tickets…
          </div>
        ) : isError ? (
          <div className="px-3 py-3 text-sm text-muted-foreground">
            Can&apos;t search tickets right now
          </div>
        ) : tickets.length === 0 ? (
          <div className="px-3 py-3 text-sm text-muted-foreground">
            No matching tickets
          </div>
        ) : (
          tickets.map((ticket, idx) => (
            <button
              key={ticket.id}
              type="button"
              role="option"
              aria-selected={idx === selectedIndex}
              onClick={() => handleSelect(ticket)}
              className={cn(
                "w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors",
                idx === selectedIndex && "bg-violet-50",
              )}
            >
              <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-0.5 w-16">
                {ticket.projectKey}-{ticket.ticketNumber}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{ticket.title}</p>
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium mt-0.5",
                    STATUS_COLORS[ticket.status] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {ticket.status.replace("_", " ")}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
