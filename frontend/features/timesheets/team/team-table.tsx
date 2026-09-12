"use client";

import { memo, useMemo } from "react";
import { format, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { PERIOD_STATUS_BADGE, PERIOD_STATUS_LABEL } from "@/features/timesheets/types";
import type { PeriodStatus, TimesheetPeriod } from "@/features/timesheets/types";
import { cn } from "@/lib/utils";

export interface TeamMemberRow {
  userId: string;
  name: string;
  email: string;
  period: TimesheetPeriod | null;
  totalHours: number;
  dailyHours: Record<string, number>;
  status: "MISSING" | PeriodStatus;
}

interface TeamTableProps {
  rows: TeamMemberRow[];
  weekStart: Date;
  isLoading: boolean;
  onRowClick: (row: TeamMemberRow) => void;
}

const DayCell = memo(function DayCell({ hours }: { hours: number }) {
  if (hours === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "tabular-nums font-medium",
        hours >= 7 ? "text-status-success-ink" : hours >= 4 ? "text-status-warning-ink" : "text-muted-foreground",
      )}
    >
      {hours.toFixed(1)}
    </span>
  );
});

export function TeamTable({ rows, weekStart, isLoading, onRowClick }: TeamTableProps) {
  const days = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const columns = useMemo<DataTableColumn<TeamMemberRow>[]>(
    () => [
      {
        key: "name",
        header: "Member",
        cell: (row) => (
          <div className="min-w-0">
            <TruncatedText text={row.name || row.email} className="font-medium text-dense text-foreground" />
            {row.name && <TruncatedText text={row.email} className="text-micro text-muted-foreground" />}
          </div>
        ),
        sortable: true,
        sortValue: (row) => row.name || row.email,
      },
      ...days.map(
        (day): DataTableColumn<TeamMemberRow> => ({
          key: format(day, "yyyy-MM-dd"),
          header: format(day, "EEE"),
          headerClassName: "text-center",
          className: "text-center w-12",
          cell: (row) => (
            <DayCell hours={row.dailyHours[format(day, "yyyy-MM-dd")] ?? 0} />
          ),
        }),
      ),
      {
        key: "total",
        header: "Total",
        className: "tabular-nums font-medium text-right w-16",
        headerClassName: "text-right",
        cell: (row) => `${row.totalHours.toFixed(1)}h`,
        sortable: true,
        sortValue: (row) => row.totalHours,
      },
      {
        key: "status",
        header: "Status",
        className: "w-24",
        cell: (row) => {
          if (row.status === "MISSING")
            return (
              <Badge className="text-micro border px-1.5 py-0 bg-muted text-muted-foreground border-border">
                Missing
              </Badge>
            );
          return (
            <Badge className={cn("text-micro border px-1.5 py-0", PERIOD_STATUS_BADGE[row.status])}>
              {PERIOD_STATUS_LABEL[row.status]}
            </Badge>
          );
        },
        sortable: true,
        sortValue: (row) => row.status,
      },
    ],
    [days],
  );

  return (
    <DataTable
      className="flex-1 min-h-0"
      data={rows}
      columns={columns}
      getRowKey={(row) => row.userId}
      onRowClick={onRowClick}
      isLoading={isLoading}
      minWidth="900px"
      emptyState={
        <EmptyState
          illustrationPreset="team"
          title="No team members"
          description="No members match the selected filters."
          compact
        />
      }
    />
  );
}
