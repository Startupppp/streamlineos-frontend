"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useHelpdeskTickets,
  HELPDESK_CATEGORY_LABELS,
  type HelpdeskTicket,
  type TicketStatus,
} from "@/hooks/api/hr/helpdesk";
import { CreateTicketDialog } from "./create-ticket-dialog";
import { TicketDetailSheet } from "./ticket-detail-sheet";

const STATUS_COLORS: Record<TicketStatus, string> = {
  TODO: "bg-muted text-muted-foreground dark:bg-slate-800/40 dark:text-slate-400",
  IN_PROGRESS: "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  IN_REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  DONE: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  TODO: "Open",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Resolved",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-blue-600 dark:text-blue-400",
  HIGH: "text-amber-600 dark:text-amber-400",
  URGENT: "text-red-600 dark:text-red-400",
};

export function MyTicketsTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const { data, isLoading } = useHelpdeskTickets({ pageSize: 50 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} ticket${data.total !== 1 ? "s" : ""}` : ""}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Request
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">No tickets yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Submit a request when you need HR support.</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Request
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {data.items.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              onClick={() => setSelectedTicketId(ticket.id)}
            />
          ))}
        </div>
      )}

      <CreateTicketDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <TicketDetailSheet
        ticketId={selectedTicketId}
        isAdmin={false}
        onClose={() => setSelectedTicketId(null)}
      />
    </div>
  );
}

function TicketRow({ ticket, onClick }: { ticket: HelpdeskTicket; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", STATUS_COLORS[ticket.status])}>
            {STATUS_LABELS[ticket.status]}
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">
            {ticket.category ? (HELPDESK_CATEGORY_LABELS[ticket.category as keyof typeof HELPDESK_CATEGORY_LABELS] ?? ticket.category) : "Other"}
          </span>
          {ticket.isConfidential && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1">Confidential</Badge>
          )}
        </div>
        <p className="text-sm font-medium text-foreground truncate">{ticket.title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {format(new Date(ticket.createdAt), "MMM d, yyyy")}
          <span className={cn("ml-2 font-medium", PRIORITY_COLORS[ticket.priority])}>{ticket.priority}</span>
        </p>
      </div>
    </button>
  );
}
