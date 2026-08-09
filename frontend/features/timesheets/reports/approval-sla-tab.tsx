"use client";

import { useCallback, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle2, Hourglass, Inbox, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useApprovalSlaReport } from "@/hooks/api/timesheets-core/reports";
import type { ApprovalSlaApprover } from "./reports-types";
import { memberLabel } from "./report-format";

interface ApprovalSlaTabProps {
  params: { startDate: string; endDate: string };
  enabled: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  OPEN: "Open",
  DRAFT: "Draft",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const COLUMNS: DataTableColumn<ApprovalSlaApprover>[] = [
  {
    key: "approver",
    header: "Approver",
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
    key: "pendingCount",
    header: "Pending",
    cell: (row) =>
      row.pendingCount > 0 ? (
        <Badge className="border px-1.5 py-0 text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30">
          {row.pendingCount} pending
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    sortable: true,
    sortValue: (row) => row.pendingCount,
  },
  {
    key: "avgDecisionHours",
    header: "Avg Decision Time",
    cell: (row) => (
      <span className="tabular-nums">
        {row.avgDecisionHours === null ? "—" : `${row.avgDecisionHours.toFixed(1)}h`}
      </span>
    ),
    sortable: true,
    sortValue: (row) => row.avgDecisionHours ?? -1,
  },
];

function getApproverRowKey(row: ApprovalSlaApprover): string {
  return row.approverId;
}

function renderApproverMobileCard(row: ApprovalSlaApprover) {
  return (
    <div className="space-y-1.5">
      <p className="truncate text-sm font-medium text-foreground">{memberLabel(row.name, row.email)}</p>
      <p className="text-xs tabular-nums text-muted-foreground">
        {row.pendingCount} pending ·{" "}
        {row.avgDecisionHours === null
          ? "no decisions yet"
          : `${row.avgDecisionHours.toFixed(1)}h avg decision`}
      </p>
    </div>
  );
}

export function ApprovalSlaTab({ params, enabled }: ApprovalSlaTabProps) {
  const { data, isLoading, isError, refetch } = useApprovalSlaReport(params, enabled);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const statusEntries = useMemo(
    () => Object.entries(data?.byStatus ?? {}).sort((a, b) => b[1] - a[1]),
    [data],
  );

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load approval SLA"
        description="Something went wrong while loading the approval SLA report."
        onRetry={handleRetry}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <Skeleton className="h-[72px] rounded-lg" />
        <DataTableSkeleton rows={6} columns={3} />
      </div>
    );
  }

  const pendingCount = data.byStatus.SUBMITTED ?? 0;

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <StatCardGrid cols={4}>
        <StatCard label="Submitted" value={data.totalSubmitted} icon={Inbox} tone="blue" />
        <StatCard
          label="Avg Time to Decision"
          value={data.avgHoursToDecision === null ? "—" : `${data.avgHoursToDecision.toFixed(1)}h`}
          icon={Timer}
          tone="emerald"
        />
        <StatCard
          label="Awaiting Approval"
          value={pendingCount}
          icon={Hourglass}
          tone={pendingCount > 0 ? "amber" : "default"}
        />
        <StatCard
          label="Oldest Pending"
          value={data.oldestPending === null ? "None" : `${data.oldestPending.daysWaiting.toFixed(1)}d`}
          icon={CheckCircle2}
          tone={data.oldestPending === null ? "emerald" : "red"}
          hint={
            data.oldestPending === null
              ? undefined
              : `Submitted ${format(parseISO(data.oldestPending.submittedAt), "MMM d, yyyy")}`
          }
        />
      </StatCardGrid>

      {data.totalSubmitted === 0 ? (
        <EmptyState
          illustrationPreset="chart"
          title="No submissions"
          description="No timesheet periods were submitted in this date range."
          className="min-h-[40dvh]"
        />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Submissions by Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {statusEntries.map(([status, count]) => (
                <Badge
                  key={status}
                  variant="outline"
                  className="gap-1 px-2 py-0.5 text-xs font-normal"
                >
                  {statusLabel(status)}
                  <span className="font-medium tabular-nums">{count}</span>
                </Badge>
              ))}
            </CardContent>
          </Card>

          {data.perApprover.length === 0 ? (
            <EmptyState
              illustrationPreset="chart"
              title="No approver activity"
              description="No approvers were assigned to the submitted periods in this range."
              compact
            />
          ) : (
            <DataTable
              data={data.perApprover}
              columns={COLUMNS}
              getRowKey={getApproverRowKey}
              pagination={{}}
              mobileCard={renderApproverMobileCard}
              className="flex-1 min-h-0"
            />
          )}
        </>
      )}
    </div>
  );
}
