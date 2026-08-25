"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { PreviewRow } from "./bulk-onboard-template";

interface BulkOnboardPreviewTableProps {
  rows: PreviewRow[];
}

export function BulkOnboardPreviewTable({ rows }: BulkOnboardPreviewTableProps) {
  const columns = useMemo<DataTableColumn<PreviewRow>[]>(
    () => [
      {
        key: "_idx",
        header: "#",
        cell: (row) => <span className="text-muted-foreground tabular-nums">{row._idx}</span>,
        className: "w-10 text-xs",
      },
      {
        key: "name",
        header: "Name",
        cell: (row) => (
          <span className="text-xs font-medium">
            {row.firstName || "—"} {row.lastName}
          </span>
        ),
        className: "text-xs",
      },
      {
        key: "email",
        header: "Email",
        cell: (row) => <span className="text-xs max-w-[180px] truncate block">{row.email || "—"}</span>,
        className: "text-xs",
      },
      {
        key: "designation",
        header: "Designation",
        cell: (row) => <span className="text-xs">{row.designation || "—"}</span>,
        className: "text-xs",
      },
      {
        key: "department",
        header: "Department",
        cell: (row) => <span className="text-xs">{row.department || "—"}</span>,
        className: "text-xs",
      },
      {
        key: "status",
        header: "Status",
        cell: (row) =>
          row.valid ? (
            <Badge variant="secondary" className="text-micro h-5 bg-status-success-surface text-status-success-ink border-0">
              Ready
            </Badge>
          ) : (
            <span className="flex flex-col gap-0.5">
              <Badge variant="destructive" className="text-micro h-5 w-fit">
                Error
              </Badge>
              <span className="text-micro text-destructive max-w-[200px]">{row.errors.join("; ")}</span>
            </span>
          ),
        className: "text-xs",
      },
    ],
    [],
  );

  return (
    <div className="rounded-lg border overflow-hidden">
      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(row) => row._idx}
      />
    </div>
  );
}
