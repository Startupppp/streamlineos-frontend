"use client";

import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { DataTableSortState } from "@/components/ui/data-table.types";
import { PM_PANEL_SOLID } from "@/components/pm-chrome";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getStatusDotClass } from "@/components/shared/ticket-status-badge";
import { formatTicketKey } from "@/components/shared/format-ticket-key";
import { getUserInitials } from "@/lib/person-display";
import { toTableTicket, type TableRow } from "./all-work-ticket-utils";
import type { AllWorkTicket } from "@/types/projects";

const BUILD_SORT_FIELDS = ["rank", "created", "updated", "priority", "dueDate"] as const;

function buildTableColumns(onTicketClick: (id: number) => void): DataTableColumn<TableRow>[] {
  return [
    {
      key: "key",
      header: "ID",
      headerClassName: "w-28 text-micro uppercase tracking-wider font-semibold",
      className: "font-mono text-dense text-muted-foreground",
      cell: (row) => (
        <span className="inline-flex rounded-md bg-muted/70 px-1.5 py-0.5 font-medium text-foreground/70 ring-1 ring-inset ring-border/50">
          {formatTicketKey(row.projectKey, row.ticketNumber, row.sequenceId ?? undefined)}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      headerClassName: "text-micro uppercase tracking-wider font-semibold",
      cell: (row) => (
        <button
          type="button"
          onClick={() => onTicketClick(row.id)}
          className="min-w-0 w-full text-left text-label font-semibold leading-5 hover:underline underline-offset-2"
          aria-label={`Open ${row.title}`}
        >
          <TruncatedText text={row.title} />
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-36 text-micro uppercase tracking-wider font-semibold",
      className: "text-dense text-muted-foreground",
      cell: (row) => (
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-background px-2 py-1 text-micro font-medium text-foreground">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", getStatusDotClass(row.status))} />
          <TruncatedText text={row.status.replace(/_/g, " ")} className="max-w-24" />
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      headerClassName: "w-24 text-micro uppercase tracking-wider font-semibold",
      className: "text-dense text-muted-foreground",
      cell: (row) => row.priority ? (
        <Badge variant="outline" className="h-6 rounded-full px-2 text-micro font-medium">
          {row.priority}
        </Badge>
      ) : <span aria-label="No priority">—</span>,
    },
    {
      key: "assignee",
      header: "Assignee",
      headerClassName: "w-44 text-micro uppercase tracking-wider font-semibold",
      className: "text-xs",
      cell: (row) => {
        if (!row.assignee) {
          return <span className="text-dense text-muted-foreground">—</span>;
        }
        const fullName = [row.assignee.firstName, row.assignee.lastName]
          .filter(Boolean)
          .join(" ");
        const name = row.assignee.name ?? (fullName || (row.assignee.email ?? "—"));
        return (
          <span className="flex min-w-0 items-center gap-2">
            <Avatar className="h-6 w-6 shrink-0 ring-1 ring-border/60">
              <AvatarImage src={resolveImageUrl(row.assignee.image)} />
              <AvatarFallback className="text-micro">{getUserInitials(row.assignee)}</AvatarFallback>
            </Avatar>
            <TruncatedText text={name} className="max-w-28 text-dense font-medium text-foreground/80" />
          </span>
        );
      },
    },
    {
      key: "dueDate",
      header: "Due Date",
      headerClassName: "w-28 text-micro uppercase tracking-wider font-semibold",
      className: "font-mono text-dense tabular-nums",
      cell: (row) =>
        row.dueDate
          ? new Date(row.dueDate).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            })
          : "—",
    },
  ];
}

function MobileTicketCard({ row, onTicketClick }: { row: TableRow; onTicketClick: (id: number) => void }) {
  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <button
        type="button"
        onClick={() => onTicketClick(row.id)}
        className="text-left text-label font-semibold leading-5 hover:underline underline-offset-2"
        aria-label={`Open ${row.title}`}
      >
        <TruncatedText text={row.title} />
      </button>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-micro font-medium text-foreground/70 ring-1 ring-inset ring-border/50">
          {formatTicketKey(row.projectKey, row.ticketNumber, row.sequenceId ?? undefined)}
        </span>
        <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-micro">
          <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", getStatusDotClass(row.status))} />
          {row.status.replace(/_/g, " ")}
        </Badge>
        {row.priority ? (
          <Badge variant="outline" className="h-4 px-1 text-micro">
            {row.priority}
          </Badge>
        ) : null}
        {row.dueDate ? (
          <span className="text-micro text-muted-foreground">
            {new Date(row.dueDate).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface AllWorkTableSectionProps {
  tickets: AllWorkTicket[];
  tableSelection: Set<string | number>;
  onSelectionChange: (sel: Set<string | number>) => void;
  onTicketClick: (ticketId: number) => void;
  sortState?: DataTableSortState;
  hasMore?: boolean;
  hasPrevious?: boolean;
  pageNumber?: number;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function AllWorkTableSection({
  tickets,
  tableSelection,
  onSelectionChange,
  onTicketClick,
  sortState,
  hasMore = false,
  hasPrevious = false,
  pageNumber,
  onNext,
  onPrevious,
}: AllWorkTableSectionProps) {
  const tableColumns = useMemo(
    () => buildTableColumns(onTicketClick),
    [onTicketClick],
  );

  const tableRows = useMemo(() => tickets.map(toTableTicket), [tickets]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable
        data={tableRows}
        columns={tableColumns}
        getRowKey={(row) => row.id}
        onRowClick={(row) => onTicketClick(row.id)}
        selection={{
          selected: tableSelection,
          onChange: onSelectionChange,
          getRowLabel: (row) => row.title,
        }}
        sortState={
          sortState
            ? { ...sortState, fields: BUILD_SORT_FIELDS }
            : undefined
        }
        pagination={
          onNext || onPrevious
            ? {
                mode: "cursor",
                pageSize: 50,
                pageNumber,
                hasMore,
                hasPrevious,
                onNext: onNext ?? (() => {}),
                onPrevious: onPrevious ?? (() => {}),
              }
            : undefined
        }
        mobileCard={(row) => (
          <MobileTicketCard row={row} onTicketClick={onTicketClick} />
        )}
        minWidth="640px"
        className={cn(PM_PANEL_SOLID, "min-h-0 flex-1 overflow-hidden")}
      />
    </div>
  );
}
