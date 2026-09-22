"use client";

import { memo, useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatTicketKey } from "@/components/shared/format-ticket-key";
import { cn } from "@/lib/utils";
import { TicketQuickActions } from "./ticket-quick-actions";
import { InlineStatus, InlinePriority, InlineAssignee, InlineEstimate, InlineFieldWrapper, InlineFieldCell } from "./card-inline-fields";
import { InlineType, InlineLabels, InlineCycle } from "./card-inline-extra-fields";
import { InlineDueDate } from "./card-inline-date-fields";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { type Ticket, type TableViewProps, isOverdue } from "./table-view-types";
import { useCan } from "@/hooks/api/access";

export const TableView = memo(function TableView({ tickets, onTicketClick, projectKey, projectId, projectStatuses, displayOptions, selection }: TableViewProps) {
  const canUpdate = useCan("build:tickets:update");
  const canAssign = useCan("build:tickets:assign");
  const hasProjectId = projectId != null;
  const hasEditableProject = hasProjectId && canUpdate;
  const hasAssignableProject = hasProjectId && canAssign;

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
        <InlineFieldCell>
          {hasEditableProject ? (
            <InlineType ticketId={ticket.id} projectId={projectId} currentType={ticket.type} />
          ) : (
            <span className="text-micro text-muted-foreground">{ticket.type}</span>
          )}
        </InlineFieldCell>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-28",
      cell: (ticket) => (
        <InlineFieldCell>
          {hasEditableProject ? (
            <InlineStatus
              ticketId={ticket.id}
              projectId={projectId}
              currentStatus={ticket.status}
              projectStatuses={projectStatuses}
            />
          ) : (
            <span className="text-micro text-muted-foreground">{ticket.status}</span>
          )}
        </InlineFieldCell>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      headerClassName: "hidden sm:table-cell",
      className: "hidden sm:table-cell w-24",
      cell: (ticket) => (
        <InlineFieldCell>
          {hasEditableProject ? (
            <InlinePriority ticketId={ticket.id} projectId={projectId} currentPriority={ticket.priority} />
          ) : ticket.priority ? (
            <span className="text-micro text-muted-foreground">{ticket.priority}</span>
          ) : null}
        </InlineFieldCell>
      ),
    },
    {
      key: "points",
      header: "Points",
      headerClassName: "hidden lg:table-cell",
      className: "hidden lg:table-cell w-20",
      cell: (ticket) => (
        <InlineFieldCell>
          {hasEditableProject ? (
            <InlineEstimate ticketId={ticket.id} projectId={projectId} currentPoints={ticket.points} />
          ) : (
            <span className="font-mono text-dense tabular-nums">{ticket.points ?? "—"}</span>
          )}
        </InlineFieldCell>
      ),
    },
    {
      key: "assignee",
      header: "Assignee",
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell w-32",
      cell: (ticket) => (
        <InlineFieldCell>
          {hasAssignableProject ? (
            <InlineAssignee
              ticketId={ticket.id}
              projectId={projectId}
              currentAssigneeId={ticket.assigneeId ?? ticket.assignee?.id}
              assignee={ticket.assignee}
            />
          ) : ticket.assignee ? (
            <span className="text-micro text-muted-foreground">
              {ticket.assignee.name || `${ticket.assignee.firstName ?? ""} ${ticket.assignee.lastName ?? ""}`.trim()}
            </span>
          ) : (
            <span className="text-micro text-muted-foreground">Unassigned</span>
          )}
        </InlineFieldCell>
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
          <InlineFieldCell>
            {hasEditableProject ? (
              <InlineLabels ticketId={ticket.id} projectId={projectId} currentLabelIds={labelIds} />
            ) : null}
          </InlineFieldCell>
        );
      },
    },
    {
      key: "cycle",
      header: "Cycle",
      headerClassName: "hidden xl:table-cell",
      className: "hidden xl:table-cell w-28",
      cell: (ticket) => (
        <InlineFieldCell>
          {hasEditableProject ? (
            <InlineCycle ticketId={ticket.id} projectId={projectId} currentCycleId={ticket.cycleId} />
          ) : null}
        </InlineFieldCell>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      headerClassName: "hidden sm:table-cell",
      className: "hidden sm:table-cell w-28",
      cell: (ticket) => (
        <InlineFieldCell>
          {hasEditableProject ? (
            <InlineDueDate ticketId={ticket.id} projectId={projectId} currentDueDate={ticket.dueDate} />
          ) : ticket.dueDate ? (
            <span className={cn("font-mono text-dense tabular-nums", isOverdue(ticket) && "text-destructive font-medium")}>
              {new Date(ticket.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
            </span>
          ) : (
            <span className="font-mono text-dense tabular-nums">—</span>
          )}
        </InlineFieldCell>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (ticket) => (
        <InlineFieldCell>
          <InlineFieldWrapper>
            <TicketQuickActions
              ticketId={ticket.id}
              projectId={projectId}
            />
          </InlineFieldWrapper>
        </InlineFieldCell>
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
    hasEditableProject,
    hasAssignableProject,
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
        selection={
          selection && canUpdate
            ? { ...selection, getRowLabel: (ticket: Ticket) => ticket.title }
            : undefined
        }
        pagination={{ pageSize: 50 }}
        minWidth="640px"
        className="w-full min-w-0 overflow-hidden"
        emptyState={<EmptyState className="border-0 bg-transparent min-h-[40vh]" title="No work items" />}
      />
    </div>
  );
});
