"use client";

import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";

type Ticket = {
  id: number;
  title: string;
  status: string;
  priority: string | null;
  updatedAt: Date | null;
  project: {
    id: number;
    name: string;
    key: string;
  } | null;
  sprint: {
    name: string;
  } | null;
};

interface EmployeeTicketsListProps {
  tickets: Ticket[];
}

const TICKET_COLUMNS: DataTableColumn<Ticket>[] = [
  {
    key: "key",
    header: "Key",
    cell: (row) => (
      <span className="font-medium">
        {row.project?.key}-{row.id}
      </span>
    ),
  },
  {
    key: "title",
    header: "Title",
    className: TABLE_TITLE_CELL,
    cell: (row) => (
      <span className={TEXT_ONE_LINE} title={row.title}>
        {row.title}
      </span>
    ),
  },
  {
    key: "project",
    header: "Project",
    cell: (row) =>
      row.project ? (
        <Link
          href={"/projects/" + row.project.id}
          className="hover:underline text-primary"
        >
          {row.project.name}
        </Link>
      ) : (
        "-"
      ),
  },
  {
    key: "sprint",
    header: "Sprint",
    cell: (row) => row.sprint?.name || "-",
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <Badge variant="outline">{row.status}</Badge>,
  },
  {
    key: "priority",
    header: "Priority",
    cell: (row) => (
      <Badge
        variant={
          row.priority === "URGENT" || row.priority === "HIGH"
            ? "destructive"
            : row.priority === "MEDIUM"
              ? "default"
              : "secondary"
        }
      >
        {row.priority || "MEDIUM"}
      </Badge>
    ),
  },
  {
    key: "lastUpdated",
    header: "Last Updated",
    cell: (row) =>
      row.updatedAt ? format(new Date(row.updatedAt), "MMM d, yyyy") : "-",
  },
];

function getRowKey(row: Ticket) {
  return row.id;
}

export function EmployeeTicketsList({ tickets }: EmployeeTicketsListProps) {
  return (
    <DataTable
      data={tickets ?? []}
      columns={TICKET_COLUMNS}
      getRowKey={getRowKey}
      emptyState={
        <div className="text-center py-8 text-muted-foreground">
          No assigned tickets found.
        </div>
      }
    />
  );
}
