"use client";

import Link from "next/link";
import { useState } from "react";
import { UserX, UserMinus, Repeat, Users } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent, TABS_CONTENT_PAGE_BODY_CLASS } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useManagerCoverage } from "@/hooks/api/hr/reporting-lines";
import type { ManagerCoverageReport, ManagerState } from "@/hooks/api/hr/reporting-lines-schema";
import { formatShortDate } from "@/lib/date-utils";

const PAGE_TITLE = "Manager coverage";
const PAGE_SUBTITLE = "Employees whose approvals have no dependable owner, and reporting lines that need repair";

type CoverageTab = "withoutManager" | "inactiveManager" | "circular" | "overSpan";

const MANAGER_STATE_LABEL: Record<ManagerState, string> = {
  active: "Active",
  "on-notice": "On notice",
  inactive: "Inactive",
  exited: "Exited",
};

function personLink(userId: string | null, name: string | null, fallback: string) {
  const label = name ?? fallback;
  if (!userId) return <span className="truncate">{label}</span>;
  return (
    <Link href={`/hr/employees/${userId}`} className="truncate text-primary hover:underline">
      {label}
    </Link>
  );
}

const WITHOUT_MANAGER_COLUMNS: DataTableColumn<ManagerCoverageReport["withoutManager"][number]>[] = [
  { key: "employee", header: "Employee", cell: (row) => personLink(row.userId, row.name, row.employeeNumber) },
  { key: "designation", header: "Designation", cell: (row) => <span className="truncate">{row.designation ?? "—"}</span> },
  { key: "status", header: "Employment", cell: (row) => <Badge variant="outline" className="h-4 px-1.5 py-0 text-micro">{row.lifecycleStatus}</Badge> },
  { key: "employeeNumber", header: "Employee no.", cell: (row) => <span className="font-mono text-dense">{row.employeeNumber}</span> },
];

const INACTIVE_MANAGER_COLUMNS: DataTableColumn<ManagerCoverageReport["inactiveManager"][number]>[] = [
  { key: "employee", header: "Employee", cell: (row) => personLink(row.userId, row.name, "Unnamed employee") },
  { key: "manager", header: "Reports to", cell: (row) => personLink(row.managerUserId, row.managerName, "Unnamed manager") },
  { key: "state", header: "Manager state", cell: (row) => <Badge variant="outline" className="h-4 px-1.5 py-0 text-micro">{MANAGER_STATE_LABEL[row.managerState]}</Badge> },
  { key: "since", header: "Since", cell: (row) => <span className="font-mono text-dense">{formatShortDate(row.effectiveFrom)}</span> },
];

const CIRCULAR_COLUMNS: DataTableColumn<ManagerCoverageReport["circular"][number] & { key: string }>[] = [
  {
    key: "chain",
    header: "Reporting loop",
    cell: (row) => (
      <div className="flex flex-wrap items-center gap-1">
        {row.userIds.map((userId, index) => (
          <span key={userId} className="flex items-center gap-1">
            {index > 0 ? <span className="text-muted-foreground">→</span> : null}
            <Link href={`/hr/employees/${userId}`} className="font-mono text-dense text-primary hover:underline">
              {userId}
            </Link>
          </span>
        ))}
      </div>
    ),
  },
];

const OVER_SPAN_COLUMNS: DataTableColumn<ManagerCoverageReport["overSpan"][number]>[] = [
  { key: "manager", header: "Manager", cell: (row) => personLink(row.managerUserId, row.managerName, "Unnamed manager") },
  { key: "reports", header: "Direct reports", cell: (row) => <span className="font-mono tabular-nums">{row.directReports}</span> },
];

function LoadingBody() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <StatCardGridSkeleton cols={4} />
      <DataTableSkeleton rows={8} columns={4} />
    </div>
  );
}

export function ManagerCoveragePage() {
  const { data, isLoading, isError, error, refetch } = useManagerCoverage();
  const [tab, setTab] = useState<CoverageTab>("withoutManager");
  const pageState = usePageState({ permission: "hr:employees:view", module: "hr", isLoading, isError, error });

  function handleRetry() {
    void refetch();
  }

  function handleTabChange(value: string) {
    if (value === "withoutManager" || value === "inactiveManager" || value === "circular" || value === "overSpan") setTab(value);
  }

  if (pageState.kind === "loading") {
    return (
      <PageWrapper title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
        <LoadingBody />
      </PageWrapper>
    );
  }

  if (pageState.kind !== "ready" || !data) {
    return (
      <PageWrapper title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
        <PageState resolution={pageState} loading={<LoadingBody />} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  const healthy = data.summary.withoutManager + data.summary.inactiveManager + data.summary.circular + data.summary.overSpan === 0;

  return (
    <PageWrapper title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} contentClassName="flex min-h-0 flex-1 flex-col gap-4">
      <StatCardGrid cols={4}>
        <StatCard label="Without a manager" value={data.summary.withoutManager} icon={UserX} tone={data.summary.withoutManager > 0 ? "red" : "emerald"} hint={`${data.summary.withManager} of ${data.summary.employees} covered`} />
        <StatCard label="Inactive manager" value={data.summary.inactiveManager} icon={UserMinus} tone={data.summary.inactiveManager > 0 ? "amber" : "emerald"} />
        <StatCard label="Circular lines" value={data.summary.circular} icon={Repeat} tone={data.summary.circular > 0 ? "red" : "emerald"} />
        <StatCard label={`Over ${data.spanOfControlLimit} reports`} value={data.summary.overSpan} icon={Users} tone={data.summary.overSpan > 0 ? "amber" : "emerald"} />
      </StatCardGrid>
      {healthy ? (
        <EmptyState
          className="flex-1 min-h-0"
          title="Every employee has an accountable manager"
          description="No missing, inactive or circular reporting lines and no manager over the span-of-control limit."
        />
      ) : (
        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
            <Tabs value={tab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
              <TabsList className="m-3 w-fit">
                <TabsTrigger value="withoutManager">Without manager ({data.summary.withoutManager})</TabsTrigger>
                <TabsTrigger value="inactiveManager">Inactive manager ({data.summary.inactiveManager})</TabsTrigger>
                <TabsTrigger value="circular">Circular ({data.summary.circular})</TabsTrigger>
                <TabsTrigger value="overSpan">Span of control ({data.summary.overSpan})</TabsTrigger>
              </TabsList>
              <TabsContent value="withoutManager" className={TABS_CONTENT_PAGE_BODY_CLASS}>
                <DataTable
                  className="flex-1 min-h-0"
                  data={data.withoutManager}
                  columns={WITHOUT_MANAGER_COLUMNS}
                  getRowKey={(row) => row.employmentId}
                  emptyState={<EmptyState className="border-0 bg-transparent min-h-[40vh]" title="Everyone has a manager" description="Every active employee reports to someone." />}
                  pagination={{ pageSize: 25 }}
                />
              </TabsContent>
              <TabsContent value="inactiveManager" className={TABS_CONTENT_PAGE_BODY_CLASS}>
                <DataTable
                  className="flex-1 min-h-0"
                  data={data.inactiveManager}
                  columns={INACTIVE_MANAGER_COLUMNS}
                  getRowKey={(row, index) => `${row.userId ?? "employee"}-${index}`}
                  emptyState={<EmptyState className="border-0 bg-transparent min-h-[40vh]" title="All managers are active" description="No employee reports to an exited, suspended or deactivated manager." />}
                  pagination={{ pageSize: 25 }}
                />
              </TabsContent>
              <TabsContent value="circular" className={TABS_CONTENT_PAGE_BODY_CLASS}>
                <DataTable
                  className="flex-1 min-h-0"
                  data={data.circular.map((cycle) => ({ ...cycle, key: cycle.userIds.join(">") }))}
                  columns={CIRCULAR_COLUMNS}
                  getRowKey={(row) => row.key}
                  emptyState={<EmptyState className="border-0 bg-transparent min-h-[40vh]" title="No circular reporting lines" description="No chain of managers loops back on itself." />}
                  pagination={{ pageSize: 25 }}
                />
              </TabsContent>
              <TabsContent value="overSpan" className={TABS_CONTENT_PAGE_BODY_CLASS}>
                <DataTable
                  className="flex-1 min-h-0"
                  data={data.overSpan}
                  columns={OVER_SPAN_COLUMNS}
                  getRowKey={(row, index) => `${row.managerUserId ?? "manager"}-${index}`}
                  emptyState={<EmptyState className="border-0 bg-transparent min-h-[40vh]" title="Spans of control are within limits" description={`No manager has more than ${data.spanOfControlLimit} direct reports.`} />}
                  pagination={{ pageSize: 25 }}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
