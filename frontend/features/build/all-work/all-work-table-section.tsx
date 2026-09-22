"use client";

import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { DataTableSortState } from "@/components/ui/data-table.types";
import { PM_PANEL_SOLID } from "@/components/pm-chrome";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toTableTicket, type TableRow } from "./all-work-ticket-utils";
import type { AllWorkTicket } from "@/types/projects";

const BUILD_SORT_FIELDS = ["rank", "created", "updated", "priority", "dueDate"] as const;

function buildTableColumns(onTicketClick: (id: number) => void): DataTableColumn<TableRow>[] {
  return [
    {
      key: "key",
      header: "ID",
      headerClassName: "w-16 text-micro uppercase tracking-wider font-bold",
      className: "font-mono text-dense text-muted-foreground",
      cell: (row) => `${row.sequenceId ?? row.ticketNumber}`,
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      headerClassName: "text-micro uppercase tracking-wider font-bold",
      cell: (row) => (
        <button
          type="button"
          onClick={() => onTicketClick(row.id)}
          className="text-left text-label font-medium hover:underline underline-offset-2 min-w-0 w-full"
        >
          <TruncatedText text={row.title} />
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-28 text-micro uppercase tracking-wider font-bold",
      className: "text-dense text-muted-foreground",
      cell: (row) => row.status.replace(/_/g, " "),
    },
    {
      key: "priority",
      header: "Priority",
      headerClassName: "w-24 text-micro uppercase tracking-wider font-bold",
      className: "text-dense text-muted-foreground",
      cell: (row) => row.priority ?? "—",
    },
    {
      key: "assignee",
      header: "Assignee",
      headerClassName: "w-32 text-micro uppercase tracking-wider font-bold",
      className: "text-xs",
      cell: (row) => {
        if (!row.assignee) {
          return <span className="text-dense text-muted-foreground">—</span>;
        }
        const fullName = [row.assignee.firstName, row.assignee.lastName]
          .filter(Boolean)
          .join(" ");
        const name = row.assignee.name ?? (fullName || (row.assignee.email ?? "—"));
        return <TruncatedText text={name} className="max-w-[8rem] text-dense" />;
      },
    },
    {
      key: "dueDate",
      header: "Due Date",
      headerClassName: "w-28 text-micro uppercase tracking-wider font-bold",
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
    <div className="flex flex-col gap-1 px-3 py-2.5">
      <button
        type="button"
        onClick={() => onTicketClick(row.id)}
        className="text-left text-label font-medium hover:underline underline-offset-2"
      >
        <TruncatedText text={row.title} />
      </button>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-micro text-muted-foreground">
          {row.sequenceId ?? row.ticketNumber}
        </span>
        <Badge variant="secondary" className="h-4 px-1 text-micro">
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
    <div className="pb-2 pt-2">
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
        className={cn(PM_PANEL_SOLID, "overflow-hidden")}
      />
    </div>
  );
}
