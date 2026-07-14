"use client";

import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PM_PANEL_SOLID } from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { cn } from "@/lib/utils";
import { toTableTicket, type TableRow } from "./all-work-ticket-utils";
import type { AllWorkTicket } from "@/types/projects";

function buildTableColumns(onTicketClick: (id: number) => void): DataTableColumn<TableRow>[] {
  return [
    {
      key: "key",
      header: "ID",
      headerClassName: "w-16 text-[10px] uppercase tracking-wider font-bold",
      className: "font-mono text-[11px] text-muted-foreground",
      cell: (row) => `${row.sequenceId ?? row.ticketNumber}`,
    },
    {
      key: "title",
      header: "Title",
      headerClassName: "text-[10px] uppercase tracking-wider font-bold",
      cell: (row) => (
        <button
          type="button"
          onClick={() => onTicketClick(row.id)}
          className={cn(
            TEXT_ONE_LINE,
            "block max-w-[min(100%,28rem)] text-left text-[13px] font-medium hover:underline underline-offset-2",
          )}
          title={row.title}
        >
          {row.title}
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-28 text-[10px] uppercase tracking-wider font-bold",
      className: "text-[11px] text-muted-foreground",
      cell: (row) => row.status.replace(/_/g, " "),
    },
    {
      key: "priority",
      header: "Priority",
      headerClassName: "w-24 text-[10px] uppercase tracking-wider font-bold",
      className: "text-[11px] text-muted-foreground",
      cell: (row) => row.priority ?? "—",
    },
    {
      key: "assignee",
      header: "Assignee",
      headerClassName: "w-32 text-[10px] uppercase tracking-wider font-bold",
      className: "text-[12px]",
      cell: (row) => {
        if (!row.assignee) {
          return <span className="text-[11px] text-muted-foreground">—</span>;
        }
        const fullName = [row.assignee.firstName, row.assignee.lastName]
          .filter(Boolean)
          .join(" ");
        const name = row.assignee.name ?? (fullName || (row.assignee.email ?? "—"));
        return (
          <span className={cn(TEXT_ONE_LINE, "block max-w-[8rem] text-[11px]")} title={name}>
            {name}
          </span>
        );
      },
    },
    {
      key: "dueDate",
      header: "Due Date",
      headerClassName: "w-28 text-[10px] uppercase tracking-wider font-bold",
      className: "font-mono text-[11px] tabular-nums",
      cell: (row) =>
        row.dueDate
          ? new Date(row.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "—",
    },
  ];
}

interface AllWorkTableSectionProps {
  tickets: AllWorkTicket[];
  tableSelection: Set<string | number>;
  onSelectionChange: (sel: Set<string | number>) => void;
  onTicketClick: (ticketId: number) => void;
}

export function AllWorkTableSection({
  tickets,
  tableSelection,
  onSelectionChange,
  onTicketClick,
}: AllWorkTableSectionProps) {
  const tableColumns = useMemo(
    () => buildTableColumns(onTicketClick),
    [onTicketClick],
  );

  const tableRows = useMemo(() => tickets.map(toTableTicket), [tickets]);

  return (
    <div className="px-3 pb-2 pt-2 sm:px-4">
      <DataTable
        data={tableRows}
        columns={tableColumns}
        getRowKey={(row) => row.id}
        onRowClick={(row) => onTicketClick(row.id)}
        selection={{ selected: tableSelection, onChange: onSelectionChange }}
        minWidth="640px"
        className={cn(PM_PANEL_SOLID, "overflow-hidden")}
      />
    </div>
  );
}
