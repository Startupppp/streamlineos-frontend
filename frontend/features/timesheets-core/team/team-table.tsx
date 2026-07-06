"use client";

import { memo, useMemo, useCallback } from "react";
import { format, addDays } from "date-fns";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PERIOD_STATUS_BADGE, PERIOD_STATUS_LABEL } from "@/features/timesheets-core/types";
import type { PeriodStatus, TimesheetPeriod } from "@/features/timesheets-core/types";
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
  onRemindAll: () => void;
}

const DayCell = memo(function DayCell({ hours }: { hours: number }) {
  if (hours === 0) return <span className="text-muted-foreground/30">—</span>;
  return (
    <span
      className={cn(
        "tabular-nums font-medium",
        hours >= 7 ? "text-emerald-600" : hours >= 4 ? "text-amber-600" : "text-slate-600",
      )}
    >
      {hours.toFixed(1)}
    </span>
  );
});

export function TeamTable({ rows, weekStart, isLoading, onRowClick, onRemindAll }: TeamTableProps) {
  const days = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const missingCount = rows.filter(
    (r) => r.status === "MISSING" || r.status === "OPEN" || r.status === "DRAFT",
  ).length;

  const columns = useMemo<DataTableColumn<TeamMemberRow>[]>(
    () => [
      {
        key: "name",
        header: "Member",
        cell: (row) => (
          <div>
            <p className="text-[11px] font-medium text-foreground">{row.name || row.email}</p>
            {row.name && <p className="text-[10px] text-muted-foreground">{row.email}</p>}
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
              <Badge className="text-[10px] border px-1.5 py-0 bg-slate-100 text-slate-600 border-slate-200">
                Missing
              </Badge>
            );
          return (
            <Badge className={cn("text-[10px] border px-1.5 py-0", PERIOD_STATUS_BADGE[row.status])}>
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

  const handleRemindAll = useCallback(() => onRemindAll(), [onRemindAll]);

  const toolbar =
    missingCount > 0 ? (
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleRemindAll}>
        <Bell className="h-3 w-3" />
        Remind {missingCount} not submitted
      </Button>
    ) : undefined;

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowKey={(row) => row.userId}
      onRowClick={onRowClick}
      isLoading={isLoading}
      toolbar={toolbar}
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
