"use client";

import { useCallback, useMemo } from "react";
import { AlertTriangle, CalendarX2, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useComplianceReport } from "@/hooks/api/timesheets-core/reports";
import type { ComplianceReportUser } from "./reports-types";
import { formatReportHours, memberLabel } from "./report-format";

interface ComplianceTabProps {
  params: { startDate: string; endDate: string };
  enabled: boolean;
}

const COLUMNS: DataTableColumn<ComplianceReportUser>[] = [
  {
    key: "member",
    header: "Member",
    cell: (row) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{memberLabel(row.name, row.email)}</p>
        {row.name && row.email ? (
          <p className="truncate text-xs text-muted-foreground">{row.email}</p>
        ) : null}
      </div>
    ),
    sortable: true,
    sortValue: (row) => memberLabel(row.name, row.email).toLowerCase(),
    className: "max-w-[220px]",
  },
  {
    key: "expectedHours",
    header: "Expected",
    cell: (row) => (
      <span className="tabular-nums">
        {row.expectedHours === null ? "—" : formatReportHours(row.expectedHours)}
      </span>
    ),
    sortable: true,
    sortValue: (row) => row.expectedHours ?? -1,
  },
  {
    key: "actualHours",
    header: "Actual",
    cell: (row) => <span className="tabular-nums">{formatReportHours(row.actualHours)}</span>,
    sortable: true,
    sortValue: (row) => row.actualHours,
  },
  {
    key: "missingDays",
    header: "Missing Days",
    cell: (row) =>
      row.missingDays > 0 ? (
        <span className="tabular-nums text-status-warning-ink">{row.missingDays}</span>
      ) : (
        <span className="text-muted-foreground">0</span>
      ),
    sortable: true,
    sortValue: (row) => row.missingDays,
  },
  {
    key: "periodsSubmitted",
    header: "Submitted",
    cell: (row) => <span className="tabular-nums">{row.periodsSubmitted}</span>,
    sortable: true,
    sortValue: (row) => row.periodsSubmitted,
  },
  {
    key: "periodsApproved",
    header: "Approved",
    cell: (row) => <span className="tabular-nums">{row.periodsApproved}</span>,
    sortable: true,
    sortValue: (row) => row.periodsApproved,
  },
  {
    key: "periodsOverdue",
    header: "Overdue",
    cell: (row) =>
      row.periodsOverdue > 0 ? (
        <Badge className="border px-1.5 py-0 text-micro bg-status-danger-surface text-status-danger-ink border-status-danger-rule">
          {row.periodsOverdue} overdue
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    sortable: true,
    sortValue: (row) => row.periodsOverdue,
  },
];

function getComplianceRowKey(row: ComplianceReportUser): string {
  return row.userId;
}

function renderComplianceMobileCard(row: ComplianceReportUser) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-foreground">{memberLabel(row.name, row.email)}</p>
        {row.periodsOverdue > 0 ? (
          <Badge className="shrink-0 border px-1.5 py-0 text-micro bg-status-danger-surface text-status-danger-ink border-status-danger-rule">
            {row.periodsOverdue} overdue
          </Badge>
        ) : null}
      </div>
      <p className="text-xs tabular-nums text-muted-foreground">
        {formatReportHours(row.actualHours)}
        {row.expectedHours !== null ? ` of ${formatReportHours(row.expectedHours)} expected` : ""} ·{" "}
        {row.missingDays} missing day{row.missingDays === 1 ? "" : "s"}
      </p>
      <p className="text-xs tabular-nums text-muted-foreground">
        {row.periodsSubmitted} submitted · {row.periodsApproved} approved
      </p>
    </div>
  );
}

export function ComplianceTab({ params, enabled }: ComplianceTabProps) {
  const { data, isLoading, isError, refetch } = useComplianceReport(params, enabled);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const stats = useMemo(() => {
    const users = data?.users ?? [];
    return {
      members: users.length,
      missingDays: users.reduce((a, u) => a + u.missingDays, 0),
      overdue: users.reduce((a, u) => a + u.periodsOverdue, 0),
    };
  }, [data]);

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load compliance"
        description="Something went wrong while loading the compliance report."
        onRetry={handleRetry}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <DataTableSkeleton rows={8} columns={7} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <StatCardGrid cols={4}>
        <StatCard label="Tracked Members" value={stats.members} icon={Users} tone="blue" />
        <StatCard
          label="Expected Weekly Hours"
          value={data.expectedWeeklyHours === null ? "Not set" : data.expectedWeeklyHours.toFixed(1)}
          icon={Clock}
          tone="default"
        />
        <StatCard
          label="Missing Weekdays"
          value={stats.missingDays}
          icon={CalendarX2}
          tone={stats.missingDays > 0 ? "amber" : "default"}
        />
        <StatCard
          label="Overdue Periods"
          value={stats.overdue}
          icon={AlertTriangle}
          tone={stats.overdue > 0 ? "red" : "default"}
        />
      </StatCardGrid>

      {data.users.length === 0 ? (
        <EmptyState
          illustrationPreset="chart"
          title="No activity to review"
          description="No time entries or timesheet periods were found in this date range."
          className="min-h-[40dvh]"
        />
      ) : (
        <DataTable
          data={data.users}
          columns={COLUMNS}
          getRowKey={getComplianceRowKey}
          pagination={{}}
          mobileCard={renderComplianceMobileCard}
          className="flex-1 min-h-0"
        />
      )}
    </div>
  );
}
