"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Clock, TrendingUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Gated } from "@/components/shared/gated";
import { useUtilizationReport } from "@/hooks/api/timesheets-core/reports";
import type { UtilizationReport, UtilizationReportUser } from "./reports-types";
import { formatReportHours, formatReportPercent, memberLabel } from "./report-format";

const ByMemberChart = dynamic(
  () => import("./report-charts").then((m) => ({ default: m.ByMemberChart })),
  { ssr: false, loading: () => <Skeleton className="h-[220px] rounded-md" /> },
);

interface UtilizationTabProps {
  params: { startDate: string; endDate: string };
  enabled: boolean;
}

const COLUMNS: DataTableColumn<UtilizationReportUser>[] = [
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
    key: "totalHours",
    header: "Total",
    cell: (row) => <span className="tabular-nums">{formatReportHours(row.totalHours)}</span>,
    sortable: true,
    sortValue: (row) => row.totalHours,
  },
  {
    key: "billableHours",
    header: "Billable",
    cell: (row) => <span className="tabular-nums">{formatReportHours(row.billableHours)}</span>,
    sortable: true,
    sortValue: (row) => row.billableHours,
  },
  {
    key: "nonBillableHours",
    header: "Non-billable",
    cell: (row) => <span className="tabular-nums">{formatReportHours(row.nonBillableHours)}</span>,
    sortable: true,
    sortValue: (row) => row.nonBillableHours,
  },
  {
    key: "billableUtilization",
    header: "Utilization",
    cell: (row) => (
      <span className="tabular-nums font-medium">{formatReportPercent(row.billableUtilization)}</span>
    ),
    sortable: true,
    sortValue: (row) => row.billableUtilization,
  },
];

function getUtilizationRowKey(row: UtilizationReportUser): string {
  return row.userId;
}

function renderUtilizationMobileCard(row: UtilizationReportUser) {
  return (
    <div className="space-y-1.5">
      <p className="truncate text-sm font-medium text-foreground">{memberLabel(row.name, row.email)}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
        <span>
          {formatReportHours(row.billableHours)} billable · {formatReportHours(row.nonBillableHours)}{" "}
          non-billable
        </span>
        <span className="font-medium text-foreground">
          {formatReportPercent(row.billableUtilization)}
        </span>
      </div>
    </div>
  );
}

export function UtilizationTab({ params, enabled }: UtilizationTabProps) {
  const { data, isLoading, isError, refetch } = useUtilizationReport(params, enabled);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const chartData = useMemo(
    () =>
      (data?.users ?? []).map((u) => ({
        name: memberLabel(u.name, u.email),
        billableHours: u.billableHours,
        nonBillableHours: u.nonBillableHours,
      })),
    [data],
  );

  return (
    <Gated
      permission="timesheets:reports:view"
      isLoading={!isError && (isLoading || !data)}
      isError={isError}
      loading={
        <div className="space-y-4">
          <StatCardGridSkeleton cols={5} count={5} />
          <Skeleton className="h-[220px] rounded-md" />
          <DataTableSkeleton rows={8} columns={5} />
        </div>
      }
      error={
        <ErrorState
          title="Couldn't load utilization"
          description="Something went wrong while loading the utilization report."
          onRetry={handleRetry}
        />
      }
    >
      {data ? <UtilizationReportBody data={data} chartData={chartData} /> : null}
    </Gated>
  );
}

interface UtilizationReportBodyProps {
  data: UtilizationReport;
  chartData: { name: string; billableHours: number; nonBillableHours: number }[];
}

function UtilizationReportBody({ data, chartData }: UtilizationReportBodyProps) {
  const { summary, users } = data;

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <StatCardGrid cols={5}>
        <StatCard label="Total Hours" value={summary.totalHours.toFixed(1)} icon={Clock} tone="blue" />
        <StatCard
          label="Billable Hours"
          value={summary.billableHours.toFixed(1)}
          icon={Clock}
          tone="emerald"
        />
        <StatCard
          label="Non-billable Hours"
          value={summary.nonBillableHours.toFixed(1)}
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Billable Utilization"
          value={formatReportPercent(summary.billableUtilization)}
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard label="Active Members" value={summary.activeUsers} icon={Users} tone="blue" />
      </StatCardGrid>

      {users.length === 0 ? (
        <EmptyState
          illustrationPreset="chart"
          title="No tracked time"
          description="No time entries were logged in this date range."
          className="min-h-[40dvh]"
        />
      ) : (
        <>
          <ByMemberChart data={chartData} />
          <DataTable
            data={users}
            columns={COLUMNS}
            getRowKey={getUtilizationRowKey}
            pagination={{}}
            mobileCard={renderUtilizationMobileCard}
            className="flex-1 min-h-0"
          />
        </>
      )}
    </div>
  );
}
