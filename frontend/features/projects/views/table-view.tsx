"use client";

import { memo, useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
  selection?: {
    selected: Set<string | number>;
    onChange: (sel: Set<string | number>) => void;
  };
}

function isOverdue(ticket: Ticket): boolean {
  if (!ticket.dueDate || ticket.status === "DONE") return false;
  const due = new Date(ticket.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export const TableView = memo(function TableView({ tickets, onTicketClick, projectKey, projectId, projectStatuses, selection }: TableViewProps) {
  const hasProjectId = projectId != null;

  const columns = useMemo<DataTableColumn<Ticket>[]>(() => [
    {
      key: "id",
      header: "ID",
      cell: (ticket) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatTicketKey(projectKey, ticket.ticketNumber, ticket.sequenceId ?? undefined)}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      cell: (ticket) => {
        function handleClick() { onTicketClick(ticket.id); }
        return (
          <button
            type="button"
            onClick={handleClick}
            className="block min-w-0 truncate text-[13px] font-medium text-left hover:underline underline-offset-2"
          >
            {ticket.title}
          </button>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell w-24",
      cell: (ticket) => (
        <div onMouseDown={stopEvent} onClick={stopEvent}>
          {hasProjectId ? (
            <InlineType ticketId={ticket.id} projectId={projectId} currentType={ticket.type} />
          ) : (
            <span className="text-[10px] text-muted-foreground">{ticket.type}</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-28",
      cell: (ticket) => (
        <div onMouseDown={stopEvent} onClick={stopEvent}>
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
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      headerClassName: "hidden sm:table-cell",
      className: "hidden sm:table-cell w-24",
      cell: (ticket) => (
        <div onMouseDown={stopEvent} onClick={stopEvent}>
          {hasProjectId ? (
            <InlinePriority ticketId={ticket.id} projectId={projectId} currentPriority={ticket.priority} />
          ) : ticket.priority ? (
            <span className="text-[10px] text-muted-foreground">{ticket.priority}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "points",
      header: "Points",
      headerClassName: "hidden lg:table-cell",
      className: "hidden lg:table-cell w-20",
      cell: (ticket) => (
        <div onMouseDown={stopEvent} onClick={stopEvent}>
          {hasProjectId ? (
            <InlineEstimate ticketId={ticket.id} projectId={projectId} currentPoints={ticket.points} />
          ) : (
            <span className="font-mono text-[11px] tabular-nums">{ticket.points ?? "—"}</span>
          )}
        </div>
      ),
    },
    {
      key: "assignee",
      header: "Assignee",
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell w-32",
      cell: (ticket) => (
        <div onMouseDown={stopEvent} onClick={stopEvent}>
          {hasProjectId ? (
            <InlineAssignee
              ticketId={ticket.id}
              projectId={projectId}
              currentAssigneeId={ticket.assigneeId ?? ticket.assignee?.id}
              assignee={ticket.assignee}
            />
          ) : null}
        </div>
      ),
    },
    {
      key: "labels",
      header: "Labels",
      headerClassName: "hidden xl:table-cell",
      className: "hidden xl:table-cell w-24",
      cell: (ticket) => {
        const labelIds = ticket.labels
          ?.map((l) => l.label?.id)
          .filter((v): v is number => v != null) ?? [];
        return (
          <div onMouseDown={stopEvent} onClick={stopEvent}>
            {hasProjectId ? (
              <InlineLabels ticketId={ticket.id} projectId={projectId} currentLabelIds={labelIds} />
            ) : null}
          </div>
        );
      },
    },
    {
      key: "cycle",
      header: "Cycle",
      headerClassName: "hidden xl:table-cell",
      className: "hidden xl:table-cell w-28",
      cell: (ticket) => (
        <div onMouseDown={stopEvent} onClick={stopEvent}>
          {hasProjectId ? (
            <InlineCycle ticketId={ticket.id} projectId={projectId} currentCycleId={ticket.cycleId} />
          ) : null}
        </div>
      ),
    },
    {
      key: "sprint",
      header: "Sprint",
      headerClassName: "hidden xl:table-cell",
      className: "hidden xl:table-cell w-28",
      cell: (ticket) => (
        <div onMouseDown={stopEvent} onClick={stopEvent}>
          {hasProjectId ? (
            <InlineSprint ticketId={ticket.id} projectId={projectId} currentSprintId={ticket.sprintId} />
          ) : null}
        </div>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      headerClassName: "hidden sm:table-cell",
      className: "hidden sm:table-cell w-28",
      cell: (ticket) => (
        <div onMouseDown={stopEvent} onClick={stopEvent}>
          {hasProjectId ? (
            <InlineDueDate ticketId={ticket.id} projectId={projectId} currentDueDate={ticket.dueDate} />
          ) : ticket.dueDate ? (
            <span className={cn("font-mono text-[11px] tabular-nums", isOverdue(ticket) && "text-destructive font-medium")}>
              {new Date(ticket.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          ) : (
            <span className="font-mono text-[11px] tabular-nums">—</span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (ticket) => (
        <div onMouseDown={stopEvent} onClick={stopEvent}>
          <InlineFieldWrapper>
            <TicketQuickActions
              ticketId={ticket.id}
              projectId={projectId}
            />
          </InlineFieldWrapper>
        </div>
      ),
    },
  ], [projectKey, projectId, projectStatuses, onTicketClick, hasProjectId]);

  return (
    <div className="w-full min-w-0">
      <DataTable
        data={tickets}
        columns={columns}
        getRowKey={(ticket) => ticket.id}
        selection={selection}
        minWidth="640px"
        className="w-full min-w-0 overflow-hidden"
        emptyState={<div className="text-center py-8 text-muted-foreground text-sm">No work items found</div>}
      />
    </div>
  );
});
