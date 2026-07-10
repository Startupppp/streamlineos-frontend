"use client";

import { memo, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTicketKey } from "../shared/format-ticket-key";
import { cn } from "@/lib/utils";
import { TicketQuickActions } from "./ticket-quick-actions";
import { InlineStatus, InlinePriority, InlineAssignee, InlineEstimate, InlineFieldWrapper, stopEvent } from "./card-inline-fields";
import { InlineType, InlineLabels, InlineCycle, InlineSprint } from "./card-inline-extra-fields";
import { InlineDueDate } from "./card-inline-date-fields";

interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  priority?: string | null;
  points?: number | null;
  ticketNumber?: number;
  sequenceId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  assigneeId?: string | null;
  cycleId?: number | null;
  sprintId?: number | null;
  assignee?: { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null; image?: string | null } | null;
  labels?: { label?: { id: number; name: string; color?: string | null } }[];
}

interface TableViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
}

function isOverdue(ticket: Ticket): boolean {
  if (!ticket.dueDate || ticket.status === "DONE") return false;
  const due = new Date(ticket.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

interface TableRowItemProps {
  ticket: Ticket;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  onTicketClick: (ticketId: number) => void;
}

const TableRowItem = memo(function TableRowItem({ ticket, projectKey, projectId, projectStatuses, onTicketClick }: TableRowItemProps) {
  const handleTitleClick = useCallback(() => onTicketClick(ticket.id), [onTicketClick, ticket.id]);

  const labelIds = ticket.labels
    ?.map((l) => l.label?.id)
    .filter((v): v is number => v != null) ?? [];

  const hasProjectId = projectId != null;

  return (
    <TableRow className="h-8 hover:bg-muted/30 transition-colors">
      <TableCell className="px-2 py-1 font-mono text-[11px] text-muted-foreground">
        {formatTicketKey(projectKey, ticket.ticketNumber, ticket.sequenceId ?? undefined)}
      </TableCell>
      <TableCell className="px-2 py-1">
        <button
          type="button"
          onClick={handleTitleClick}
          className="block min-w-0 truncate text-[13px] font-medium text-left hover:underline underline-offset-2"
        >
          {ticket.title}
        </button>
      </TableCell>
      <TableCell className="hidden md:table-cell px-2 py-1" onMouseDown={stopEvent} onClick={stopEvent}>
        {hasProjectId ? (
          <InlineType ticketId={ticket.id} projectId={projectId} currentType={ticket.type} />
        ) : (
          <span className="text-[10px] text-muted-foreground">{ticket.type}</span>
        )}
      </TableCell>
      <TableCell className="px-2 py-1" onMouseDown={stopEvent} onClick={stopEvent}>
        {hasProjectId ? (
          <InlineStatus
            ticketId={ticket.id}
            projectId={projectId}
            currentStatus={ticket.status}
            projectStatuses={projectStatuses}
          />
        ) : (
          <span className="text-[10px] text-muted-foreground">{ticket.status}</span>
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell px-2 py-1" onMouseDown={stopEvent} onClick={stopEvent}>
        {hasProjectId ? (
          <InlinePriority ticketId={ticket.id} projectId={projectId} currentPriority={ticket.priority} />
        ) : ticket.priority ? (
          <span className="text-[10px] text-muted-foreground">{ticket.priority}</span>
        ) : null}
      </TableCell>
      <TableCell className="hidden lg:table-cell px-2 py-1" onMouseDown={stopEvent} onClick={stopEvent}>
        {hasProjectId ? (
          <InlineEstimate ticketId={ticket.id} projectId={projectId} currentPoints={ticket.points} />
        ) : (
          <span className="font-mono text-[11px] tabular-nums">{ticket.points ?? "—"}</span>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell px-2 py-1" onMouseDown={stopEvent} onClick={stopEvent}>
        {hasProjectId ? (
          <InlineAssignee
            ticketId={ticket.id}
            projectId={projectId}
            currentAssigneeId={ticket.assigneeId ?? ticket.assignee?.id}
            assignee={ticket.assignee}
          />
        ) : null}
      </TableCell>
      <TableCell className="hidden xl:table-cell px-2 py-1" onMouseDown={stopEvent} onClick={stopEvent}>
        {hasProjectId ? (
          <InlineLabels ticketId={ticket.id} projectId={projectId} currentLabelIds={labelIds} />
        ) : null}
      </TableCell>
      <TableCell className="hidden xl:table-cell px-2 py-1" onMouseDown={stopEvent} onClick={stopEvent}>
        {hasProjectId ? (
          <InlineCycle ticketId={ticket.id} projectId={projectId} currentCycleId={ticket.cycleId} />
        ) : null}
      </TableCell>
      <TableCell className="hidden xl:table-cell px-2 py-1" onMouseDown={stopEvent} onClick={stopEvent}>
        {hasProjectId ? (
          <InlineSprint ticketId={ticket.id} projectId={projectId} currentSprintId={ticket.sprintId} />
        ) : null}
      </TableCell>
      <TableCell className="hidden sm:table-cell px-2 py-1" onMouseDown={stopEvent} onClick={stopEvent}>
        {hasProjectId ? (
          <InlineDueDate ticketId={ticket.id} projectId={projectId} currentDueDate={ticket.dueDate} />
        ) : ticket.dueDate ? (
          <span className={cn("font-mono text-[11px] tabular-nums", isOverdue(ticket) && "text-destructive font-medium")}>
            {new Date(ticket.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        ) : (
          <span className="font-mono text-[11px] tabular-nums">—</span>
        )}
      </TableCell>
      <TableCell className="px-1 py-1" onMouseDown={stopEvent} onClick={stopEvent}>
        <InlineFieldWrapper>
          <TicketQuickActions
            ticketId={ticket.id}
            projectId={projectId}
            currentStatus={ticket.status}
            currentPriority={ticket.priority}
            currentAssigneeId={ticket.assigneeId ?? ticket.assignee?.id}
            currentType={ticket.type}
            currentLabelIds={labelIds}
            currentCycleId={ticket.cycleId}
            currentSprintId={ticket.sprintId}
            projectStatuses={projectStatuses}
          />
        </InlineFieldWrapper>
      </TableCell>
    </TableRow>
  );
});

export const TableView = memo(function TableView({ tickets, onTicketClick, projectKey, projectId, projectStatuses }: TableViewProps) {
  return (
    <div className="p-3 sm:p-4">
      <ScrollArea className="w-full border border-border rounded-md overflow-hidden" type="auto">
        <div className="min-w-full sm:min-w-[640px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <TableRow className="border-b-2 border-border">
                <TableHead className="w-16 text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">ID</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Title</TableHead>
                <TableHead className="w-24 hidden md:table-cell text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Type</TableHead>
                <TableHead className="w-28 text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Status</TableHead>
                <TableHead className="w-24 hidden sm:table-cell text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Priority</TableHead>
                <TableHead className="w-20 hidden lg:table-cell text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Points</TableHead>
                <TableHead className="w-32 hidden md:table-cell text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Assignee</TableHead>
                <TableHead className="w-24 hidden xl:table-cell text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Labels</TableHead>
                <TableHead className="w-28 hidden xl:table-cell text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Cycle</TableHead>
                <TableHead className="w-28 hidden xl:table-cell text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Sprint</TableHead>
                <TableHead className="w-28 hidden sm:table-cell text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Due Date</TableHead>
                <TableHead className="w-10 px-2 py-1.5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRowItem
                  key={ticket.id}
                  ticket={ticket}
                  projectKey={projectKey}
                  projectId={projectId}
                  projectStatuses={projectStatuses}
                  onTicketClick={onTicketClick}
                />
              ))}
              {tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground text-sm">
                    No work items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
});
