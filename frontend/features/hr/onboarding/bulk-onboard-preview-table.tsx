"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ManagerResolutionCell } from "@/components/hr/reporting-lines/manager-resolution-cell";
import { ReportingRowStatusBadge } from "@/components/hr/reporting-lines/reporting-status-badge";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BulkOnboardFlowRow } from "./use-bulk-onboard-flow";

interface BulkOnboardPreviewTableProps {
  rows: BulkOnboardFlowRow[];
}

function RowNumberCell(row: BulkOnboardFlowRow) {
  return <span className="text-muted-foreground tabular-nums">{row.fileRow}</span>;
}

function EmployeeCell(row: BulkOnboardFlowRow) {
  const name = `${row.preview.firstName} ${row.preview.lastName}`.trim();
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-xs font-medium">{name || "—"}</span>
      <span className="block max-w-48 truncate text-micro text-muted-foreground">{row.preview.email || "—"}</span>
    </span>
  );
}

function PrimaryManagerCell(row: BulkOnboardFlowRow) {
  if (!row.server) return <span className="text-xs text-muted-foreground">—</span>;
  return <ManagerResolutionCell primaryManager={row.server.primaryManager} dependsOnRow={row.dependsOnFileRow} />;
}

function SecondaryManagersCell(row: BulkOnboardFlowRow) {
  const names = row.server?.secondaryManagers ?? [];
  if (names.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className="text-xs">{names.map((manager) => manager.name).join(", ")}</span>;
}

/** Client-refused rows never reached the server: they are errors with the client's reasons. */
function StatusCell(row: BulkOnboardFlowRow) {
  const clientErrors = row.preview.errors;
  const messages = clientErrors.length > 0 ? clientErrors : (row.server?.messages ?? []);
  const codes = clientErrors.length > 0 ? [] : (row.server?.codes ?? []);
  const status = clientErrors.length > 0 ? "ERROR" : row.server?.status;
  return (
    <span className="flex max-w-64 flex-col gap-0.5">
      {status ? <ReportingRowStatusBadge status={status} className="w-fit" /> : <SemanticBadge tone="neutral" label="Not checked" size="xs" className="w-fit" />}
      {codes.length > 0 ? <span className="font-mono text-micro text-muted-foreground">{codes.join(", ")}</span> : null}
      {messages.map((message) => (
        <span key={message} className="text-micro text-muted-foreground">
          {message}
        </span>
      ))}
    </span>
  );
}

const COLUMNS: DataTableColumn<BulkOnboardFlowRow>[] = [
  { key: "row", header: "Row", cell: RowNumberCell, className: "w-12 text-xs" },
  { key: "employee", header: "Employee", cell: EmployeeCell, className: "text-xs" },
  { key: "primaryManager", header: "Primary manager", cell: PrimaryManagerCell, className: "text-xs" },
  { key: "secondaryManagers", header: "Secondary managers", cell: SecondaryManagersCell, className: "text-xs" },
  { key: "status", header: "Status", cell: StatusCell, className: "text-xs" },
];

function rowKey(row: BulkOnboardFlowRow) {
  return row.fileRow;
}

export function BulkOnboardPreviewTable({ rows }: BulkOnboardPreviewTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <DataTable data={rows} columns={COLUMNS} getRowKey={rowKey} pagination={{ pageSize: 25 }} />
    </div>
  );
}
