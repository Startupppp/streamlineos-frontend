"use client";

import { memo, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Clock, AlertTriangle, CheckCircle2, Pause } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { TablePagination } from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";
import type { SupportTicket } from "@/types/support";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-status-info-surface text-status-info-ink",
  HIGH: "bg-status-warning-surface text-status-warning-ink",
  URGENT: "bg-status-danger-surface text-status-danger-ink",
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

const TicketListItem = memo(function TicketListItem({ ticket, isSelected, onSelect }: TicketListItemProps) {
  const handleClick = useCallback(() => onSelect(ticket.id), [ticket.id, onSelect]);
  const StatusIcon = STATUS_ICONS[ticket.status] ?? Clock;
  const isBreached =
    ticket.slaDeadline &&
    new Date(ticket.slaDeadline) < new Date() &&
    !["RESOLVED", "CLOSED"].includes(ticket.status);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors",
        isSelected && "bg-muted/50 border-l-2 border-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <TruncatedText text={toTitleCase(ticket.title)} className="text-label font-semibold" />
          <p className="text-dense text-muted-foreground mt-0.5">
            #{ticket.id} {ticket.client?.name ? `- ${ticket.client.name}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            variant="outline"
            className={cn("text-micro px-1.5 py-0", PRIORITY_COLORS[ticket.priority])}
          >
            {ticket.priority}
          </Badge>
          {isBreached && (
            <Badge variant="destructive" className="text-micro px-1 py-0">
              SLA
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <StatusIcon className="h-3 w-3 text-muted-foreground" />
        <span className="text-micro text-muted-foreground">
          {ticket.status.replace("_", " ")}
        </span>
        <span className="text-micro text-muted-foreground ml-auto">
          {ticket.createdAt
            ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })
            : ""}
        </span>
      </div>
    </button>
  );
});

interface TicketListProps {
  tickets: SupportTicket[];
  isLoading: boolean;
  selectedTicketId: number | null;
  onSelect: (id: number) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function TicketList({
  tickets,
  isLoading,
  selectedTicketId,
  onSelect,
  page,
  pageSize,
  total,
  onPageChange,
}: TicketListProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  return (
    <div
      className={cn(
        "w-full md:w-[360px] border-r border-border/40 flex flex-col overflow-hidden",
        selectedTicketId && "hidden md:flex"
      )}
    >
      <ScrollArea className="flex-1 min-h-0">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-3 py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
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
      {!isLoading && totalPages > 1 ? (
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          showPageNumbers={false}
        />
      ) : null}
    </div>
  );
}
