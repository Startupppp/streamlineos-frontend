"use client";

import { useCallback, useState } from "react";
import { format, parseISO } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { formatMonth } from "@/features/payroll/shared/payroll-format";
import { usePageState } from "@/hooks/api/use-page-state";
import { usePayrollReadiness } from "@/hooks/api/payroll/readiness";
import type { PayrollReadiness } from "@/hooks/api/payroll/readiness-schema";
import { ReadinessStageList } from "./readiness-stage-list";
import { ReadinessExceptions } from "./readiness-exceptions";

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

type ReadinessExport = PayrollReadiness["exports"][number];

function stamp(value: string): string {
  return format(parseISO(value), "MMM d, h:mm a");
}

const EXPORT_COLUMNS: DataTableColumn<ReadinessExport>[] = [
  { key: "id", header: "Export", cell: (row) => <span className="text-dense tabular-nums">#{row.id}</span> },
  {
    key: "range",
    header: "Window",
    cell: (row) => (
      <span className="text-dense tabular-nums">
        {format(parseISO(row.dateRangeStart), "MMM d")} – {format(parseISO(row.dateRangeEnd), "MMM d")}
      </span>
    ),
  },
  { key: "hours", header: "Hours", headerClassName: "text-right", className: "text-right tabular-nums", cell: (row) => `${Number(row.totalHours).toFixed(1)}h` },
  { key: "workers", header: "Workers", headerClassName: "text-right", className: "text-right tabular-nums", cell: (row) => row.workerCount },
  { key: "exportedAt", header: "Exported", cell: (row) => <span className="text-dense text-muted-foreground">{stamp(row.exportedAt)}</span> },
  {
    key: "receivedAt",
    header: "Received",
    cell: (row) => (
      <span className="text-dense text-muted-foreground">
        {row.receivedAt ? stamp(row.receivedAt) : row.ackAt ? "Implied by acknowledgement" : "Not yet"}
      </span>
    ),
  },
  {
    key: "ack",
    header: "Acknowledged",
    cell: (row) => (
      <span className="text-dense text-muted-foreground">{row.ackAt ? `${row.ackStatus ?? "Acknowledged"} · ${stamp(row.ackAt)}` : "Awaiting payroll"}</span>
    ),
  },
];

function ReadinessSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <StatCardGridSkeleton cols={4} count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

export function PayrollReadinessPage() {
  const [month, setMonth] = useState(currentYearMonth);
  const { data, isLoading, isError, error, refetch } = usePayrollReadiness(month);
  const pageState = usePageState({ permission: "payroll:runs:view", module: "payroll", isLoading, isError, error });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const blockers = data?.exceptions.filter((exception) => exception.severity === "blocker").length ?? 0;
  const subtitle = data?.cutoff
    ? `${formatMonth(month)} · ${data.cutoff.title} ${format(parseISO(data.cutoff.date), "MMM d")}`
    : formatMonth(month);

  return (
    <PageWrapper
      variant="display"
      title="Payroll readiness"
      subtitle={subtitle}
      actions={<MonthPicker value={month} onChange={setMonth} yearRange={[-2, 0]} className="w-44" />}
    >
      <PageState resolution={pageState} loading={<ReadinessSkeleton />} onRetry={handleRetry} className="flex-1">
        {data ? (
          <div className="flex flex-1 min-h-0 flex-col gap-4">
            <StatCardGrid cols={4}>
              <StatCard
                label="Awaiting approval"
                value={data.timesheets.awaitingApproval}
                tone={data.timesheets.awaitingApproval > 0 ? "amber" : "emerald"}
                href="/timesheets/approvals"
              />
              <StatCard
                label="Not submitted"
                value={data.timesheets.unsubmitted}
                tone={data.timesheets.unsubmitted > 0 ? "amber" : "emerald"}
                href="/timesheets/overdue"
              />
              <StatCard
                label="Approved, not exported"
                value={`${Number(data.timesheets.approvedHoursNotExported).toFixed(1)}h`}
                tone={data.timesheets.approvedEntriesNotExported > 0 ? "amber" : "emerald"}
                href="/timesheets/payroll"
              />
              <StatCard label="Blockers" value={blockers} tone={blockers > 0 ? "red" : "emerald"} />
            </StatCardGrid>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <ReadinessStageList stages={data.stages} />
              <ReadinessExceptions exceptions={data.exceptions} />
            </div>
            <section className="rounded-xl border border-border bg-card p-4 space-y-3" aria-label="Payroll exports">
              <h3 className="text-sm font-semibold text-foreground">Exports covering this month</h3>
              {data.exports.length === 0 ? (
                <p className="text-dense text-muted-foreground">No approved hours have been exported for this month yet.</p>
              ) : (
                <DataTable data={data.exports} columns={EXPORT_COLUMNS} getRowKey={(row) => row.id} />
              )}
            </section>
          </div>
        ) : null}
      </PageState>
    </PageWrapper>
  );
}
