"use client";

import { useCallback, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle2, Hourglass, Inbox, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useApprovalSlaReport } from "@/hooks/api/timesheets-core/reports";
import type { ApprovalSlaApprover, ApprovalSlaReport } from "./reports-types";
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
    className: "max-w-[220px]",
  },
  {
    key: "pendingCount",
    header: "Pending",
    cell: (row) =>
      row.pendingCount > 0 ? (
        <Badge className="border px-1.5 py-0 text-micro bg-status-warning-surface text-status-warning-ink border-status-warning-rule">
          {row.pendingCount} pending
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "avgHoursToDecision",
    header: "Avg Decision Time",
    cell: (row) => (
      <span className="tabular-nums">
        {row.avgHoursToDecision === null ? "—" : `${row.avgHoursToDecision.toFixed(1)}h`}
      </span>
    ),
  },
];

const COLUMN_HEADERS = COLUMNS.map((column) => column.header);

function getApproverRowKey(row: ApprovalSlaApprover): string {
  return row.approverId;
}

function renderApproverMobileCard(row: ApprovalSlaApprover) {
  return (
    <div className="space-y-1.5">
      <p className="truncate text-sm font-medium text-foreground">{memberLabel(row.name, row.email)}</p>
      <p className="text-xs tabular-nums text-muted-foreground">
        {row.pendingCount} pending ·{" "}
        {row.avgHoursToDecision === null
          ? "no decisions yet"
          : `${row.avgHoursToDecision.toFixed(1)}h avg decision`}
      </p>
    </div>
  );
}

export function ApprovalSlaTab({ params, enabled }: ApprovalSlaTabProps) {
  const { data, isLoading, isError, error, refetch } = useApprovalSlaReport(params, enabled);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const statusEntries = useMemo(
    () => Object.entries(data?.byStatus ?? {}).sort((a, b) => b[1] - a[1]),
    [data],
  );

  const state = usePageState({
    permission: "timesheets:reports:view",
    isLoading: !isError && (isLoading || !data),
    isError,
    error,
  });

  return (
    <PageState
      resolution={state}
      onRetry={handleRetry}
      loading={
        <div className="space-y-4">
          <StatCardGridSkeleton cols={4} count={4} />
          <Skeleton className="h-[72px] rounded-lg" />
          <DataTableSkeleton rows={6} headers={COLUMN_HEADERS} />
        </div>
      }
    >
      {data ? <ApprovalSlaBody data={data} statusEntries={statusEntries} /> : null}
    </PageState>
  );
}

interface ApprovalSlaBodyProps {
  data: ApprovalSlaReport;
  statusEntries: [string, number][];
}

function ApprovalSlaBody({ data, statusEntries }: ApprovalSlaBodyProps) {
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
