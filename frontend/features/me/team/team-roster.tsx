"use client";

import { format, parseISO } from "date-fns";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import type { ManagerHomeReport } from "@/hooks/api/hr/manager-home-schema";

const COLUMNS: DataTableColumn<ManagerHomeReport>[] = [
  {
    key: "person",
    header: "Person",
    cell: (row) => (
      <div className="min-w-0">
        <p className="text-dense font-medium text-foreground">{row.name ?? row.email ?? "Unknown"}</p>
        {row.designation ? <p className="text-micro text-muted-foreground">{row.designation}</p> : null}
      </div>
    ),
  },
  {
    key: "today",
    header: "Today",
    cell: (row) =>
      row.onLeaveToday ? (
        <Badge className="text-micro border px-1.5 py-0 bg-status-warning-surface text-status-warning-ink border-status-warning-rule">On leave</Badge>
      ) : (
        <span className="text-dense text-muted-foreground">Working</span>
      ),
  },
  {
    key: "timesheets",
    header: "Timesheets",
    cell: (row) =>
      row.unsettledTimesheets > 0 ? (
        <span className="text-dense text-status-danger-ink">{row.unsettledTimesheets} unsettled</span>
      ) : (
        <span className="text-dense text-muted-foreground">Up to date</span>
      ),
  },
  {
    key: "probation",
    header: "Probation",
    cell: (row) =>
      row.lifecycleStatus === "PROBATION" && row.probationEndsOn ? (
        <span className="text-dense">Ends {format(parseISO(row.probationEndsOn), "MMM d")}</span>
      ) : (
        <span className="text-dense text-muted-foreground">—</span>
      ),
  },
  {
    key: "joined",
    header: "Joined",
    cell: (row) => <span className="text-dense text-muted-foreground">{row.joiningDate ? format(parseISO(row.joiningDate), "MMM d, yyyy") : "—"}</span>,
  },
];

interface TeamRosterProps {
  reports: ManagerHomeReport[];
}

export function TeamRoster({ reports }: TeamRosterProps) {
  return <DataTable data={reports} columns={COLUMNS} getRowKey={(row) => row.userId} />;
}
