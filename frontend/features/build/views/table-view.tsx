"use client";

import { memo, useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatTicketKey } from "../shared/format-ticket-key";
import { cn } from "@/lib/utils";
import { TicketQuickActions } from "./ticket-quick-actions";
import { InlineStatus, InlinePriority, InlineAssignee, InlineEstimate, InlineFieldWrapper, stopEvent } from "./card-inline-fields";
import { InlineType, InlineLabels, InlineCycle, InlineSprint } from "./card-inline-extra-fields";
import { InlineDueDate } from "./card-inline-date-fields";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import type { DisplayOptions } from "../shared/types";

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
  displayOptions?: DisplayOptions;
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

export const TableView = memo(function TableView({ tickets, onTicketClick, projectKey, projectId, projectStatuses, displayOptions, selection }: TableViewProps) {
  const hasProjectId = projectId != null;

  const showId = displayOptions?.showId ?? true;
  const showStatus = displayOptions?.showStatus ?? true;
  const showPriority = displayOptions?.showPriority ?? true;
  const showEstimate = displayOptions?.showEstimate ?? true;
  const showAssignee = displayOptions?.showAssignee ?? true;
  const showLabels = displayOptions?.showLabels ?? true;
  const showCycle = displayOptions?.showCycle ?? true;
  const showDueDate = displayOptions?.showDueDate ?? true;

  const columns = useMemo<DataTableColumn<Ticket>[]>(() => {
    const all: DataTableColumn<Ticket>[] = [
    {
      key: "id",
      header: "ID",
      cell: (ticket) => (
        <span className="font-mono text-dense text-muted-foreground">
          {formatTicketKey(projectKey, ticket.ticketNumber, ticket.sequenceId ?? undefined)}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (ticket) => {
        function handleClick() { onTicketClick(ticket.id); }
        return (
          <button
            type="button"
            onClick={handleClick}
            className="text-left text-label font-medium hover:underline underline-offset-2 min-w-0 w-full"
          >
            <TruncatedText text={ticket.title} />
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
            <span className="text-micro text-muted-foreground">{ticket.type}</span>
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
            <span className="text-micro text-muted-foreground">{ticket.status}</span>
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
            <span className="text-micro text-muted-foreground">{ticket.priority}</span>
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
            <span className="font-mono text-dense tabular-nums">{ticket.points ?? "—"}</span>
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
            <span className={cn("font-mono text-dense tabular-nums", isOverdue(ticket) && "text-destructive font-medium")}>
              {new Date(ticket.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
            </span>
          ) : (
            <span className="font-mono text-dense tabular-nums">—</span>
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
    ];
    const visibility: Record<string, boolean> = {
      id: showId,
      status: showStatus,
      priority: showPriority,
      points: showEstimate,
      assignee: showAssignee,
      labels: showLabels,
      cycle: showCycle,
      dueDate: showDueDate,
    };
    return all.filter((column) => visibility[column.key] !== false);
  }, [
    projectKey,
    projectId,
    projectStatuses,
    onTicketClick,
    hasProjectId,
    showId,
    showStatus,
    showPriority,
    showEstimate,
    showAssignee,
    showLabels,
    showCycle,
    showDueDate,
  ]);

  return (
    <div className="w-full min-w-0">
      <DataTable
        data={tickets}
        columns={columns}
        getRowKey={(ticket) => ticket.id}
        selection={selection}
        pagination={{ pageSize: 50 }}
        minWidth="640px"
        className="w-full min-w-0 overflow-hidden"
        emptyState={<EmptyState className="border-0 bg-transparent min-h-[40vh]" title="No work items" />}
      />
    </div>
  );
});
