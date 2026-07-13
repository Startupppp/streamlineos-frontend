"use client";

import { useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Clock, AlertTriangle, CheckCircle2, Pause, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import type { SupportTicket } from "@/types/support";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  OPEN: AlertTriangle,
  IN_PROGRESS: Clock,
  WAITING: Pause,
  RESOLVED: CheckCircle2,
  CLOSED: CheckCircle2,
};

function toTitleCase(str: string) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface TicketListItemProps {
  ticket: SupportTicket;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

function TicketListItem({ ticket, isSelected, onSelect }: TicketListItemProps) {
  const handleClick = useCallback(() => onSelect(ticket.id), [ticket.id, onSelect]);
  const StatusIcon = STATUS_ICONS[ticket.status] ?? Clock;
  const isBreached =
    ticket.slaDeadline &&
    new Date(ticket.slaDeadline) < new Date() &&
    !["RESOLVED", "CLOSED"].includes(ticket.status);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors",
        isSelected && "bg-muted/50 border-l-2 border-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold truncate">{toTitleCase(ticket.title)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            #{ticket.id} {ticket.client?.name ? `- ${ticket.client.name}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            variant="outline"
            className={cn("text-[9px] px-1.5 py-0", PRIORITY_COLORS[ticket.priority])}
          >
            {ticket.priority}
          </Badge>
          {isBreached && (
            <Badge variant="destructive" className="text-[9px] px-1 py-0">
              SLA
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <StatusIcon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">
          {ticket.status.replace("_", " ")}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {ticket.createdAt
            ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })
            : ""}
        </span>
      </div>
    </button>
  );
}

interface TicketListProps {
  tickets: SupportTicket[];
  isLoading: boolean;
  selectedTicketId: number | null;
  onSelect: (id: number) => void;
}

export function TicketList({
  tickets,
  isLoading,
  selectedTicketId,
  onSelect,
}: TicketListProps) {
  return (
    <div
      className={cn(
        "w-full md:w-[360px] border-r border-border/40 flex flex-col overflow-hidden",
        selectedTicketId && "hidden md:flex"
      )}
    >
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 px-4">
            <EmptyInboxIllustration className="mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No tickets found</p>
            <p className="text-xs text-muted-foreground mt-1">New tickets will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {tickets.map((ticket) => (
              <TicketListItem
                key={ticket.id}
                ticket={ticket}
                isSelected={selectedTicketId === ticket.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
