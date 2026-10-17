"use client";

import { format, parseISO } from "date-fns";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanTicket } from "../shared/types";
import { stopEvent } from "./card-field-wrapper";
import { InlineAssignee } from "./card-field-assignee";
import { TicketQuickActions } from "./ticket-quick-actions";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { TruncatedText } from "@/components/ui/truncated-text";

interface WorkloadTicketListProps {
  memberTickets: KanbanTicket[];
  projectId: number;
  projectKey?: string | null;
  expanded: boolean;
  reducedMotion: boolean | null;
}

export function WorkloadTicketList({
  memberTickets,
  projectId,
  projectKey,
  expanded,
  reducedMotion,
}: WorkloadTicketListProps) {
  if (memberTickets.length === 0) return null;

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] ease-in-out",
        reducedMotion ? "duration-0" : "duration-200",
        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="overflow-hidden bg-muted/20">
        {memberTickets.slice(0, 10).map((ticket) => (
          <div
            key={ticket.id}
            className="group/workload flex min-w-0 items-center gap-2 border-b border-border/40 px-8 py-2"
          >
            <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
              #{ticket.ticketNumber}
            </span>
            <TruncatedText text={ticket.title} className="min-w-0 flex-1 text-xs text-foreground" />
            {ticket.points != null && (
              <span className="shrink-0 text-micro tabular-nums text-muted-foreground">
                {ticket.points}pt
              </span>
            )}
            {ticket.dueDate && (
              <span className="text-micro text-muted-foreground shrink-0">
                Due {format(parseISO(ticket.dueDate), "MMM d")}
              </span>
            )}
            <Link
              href={
                ticket.ticketNumber != null
                  ? getTicketDetailHref(projectId, projectKey, ticket.ticketNumber)
                  : `/build/${projectId}`
              }
              onMouseDown={stopEvent}
              onClick={stopEvent}
              className="shrink-0 opacity-0 group-hover/workload:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
              aria-label="Open ticket"
            >
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Link>
            {ticket.version !== null ? (
              <span
                onMouseDown={stopEvent}
                onClick={stopEvent}
                onKeyDown={stopEvent}
                className="shrink-0 opacity-0 group-hover/workload:opacity-100 transition-opacity"
              >
                <InlineAssignee
                  ticketId={ticket.id}
                  projectId={projectId}
                  version={ticket.version}
                  currentAssigneeId={ticket.assigneeId}
                  assignee={ticket.assignee}
                />
              </span>
            ) : null}
            <span
              onMouseDown={stopEvent}
              onClick={stopEvent}
              onKeyDown={stopEvent}
              className="shrink-0 opacity-0 group-hover/workload:opacity-100 transition-opacity"
            >
              <TicketQuickActions ticketId={ticket.id} projectId={projectId} />
            </span>
          </div>
        ))}
        {memberTickets.length > 10 && (
          <div className="px-8 py-1.5 text-xs text-muted-foreground">
            +{memberTickets.length - 10} more tickets
          </div>
        )}
      </div>
    </div>
  );
}
