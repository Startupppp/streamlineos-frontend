"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UserX, UserMinus, Repeat, Users, Hourglass, MessageSquareWarning } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { StatCard, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useManagerCoverage } from "@/hooks/api/hr/reporting-lines";
import type { ManagerCoverageReport } from "@/hooks/api/hr/reporting-lines-schema";
import { useCan } from "@/hooks/api/access";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { circularChainRows } from "@/features/hr/employees/manager-coverage-names";
import {
  CIRCULAR_COLUMNS,
  FALLBACK_ACTION_COLUMN,
  FALLBACK_COLUMNS,
  INACTIVE_MANAGER_ASSIGN_COLUMN,
  INACTIVE_MANAGER_COLUMNS,
  OVER_SPAN_COLUMNS,
  WITHOUT_MANAGER_ASSIGN_COLUMN,
  WITHOUT_MANAGER_COLUMNS,
  fallbackCard,
  inactiveManagerCard,
  pendingReviewCard,
  pendingReviewColumns,
  withoutManagerCard,
} from "@/features/hr/employees/manager-coverage-columns";

const PAGE_TITLE = "Manager coverage";
const PAGE_SUBTITLE = "Employees whose approvals have no dependable owner, and reporting lines that need repair";

const VIEWS = [
  { value: "withoutManager", label: "Without a manager" },
  { value: "fallback", label: "Temporary fallback manager" },
  { value: "pendingReview", label: "Pending employee review" },
  { value: "inactiveManager", label: "Inactive manager" },
  { value: "circular", label: "Circular lines" },
  { value: "overSpan", label: "Span of control" },
] as const;

type CoverageView = (typeof VIEWS)[number]["value"];

function parseView(value: string | null): CoverageView {
  return VIEWS.find((view) => view.value === value)?.value ?? "withoutManager";
}

const WITHOUT_MANAGER_HEADERS = WITHOUT_MANAGER_COLUMNS.map((column) => column.header);
const SUMMARY_GRID_CLASS = "grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6";
const TABLE_EMPTY_CLASS = "border-0 bg-transparent min-h-[40vh]";

function LoadingBody() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <StatCardGridSkeleton cols={3} />
      <DataTableSkeleton rows={8} headers={WITHOUT_MANAGER_HEADERS} />
    </div>
  );
}

function memberNames(members: Array<{ userId: string; name: string | null }> | undefined): Map<string, string> {
  const names = new Map<string, string>();
  for (const member of members ?? []) if (member.name) names.set(member.userId, member.name);
  return names;
}

function PolicyMissingCallout({ canConfigure }: { canConfigure: boolean }) {
  const tone = statusToneClasses("warning");
  return (
    <div role="status" className={cn("rounded-lg border px-3 py-2 text-sm", tone.surface, tone.ink, tone.rule)}>
      <span className="font-medium">No default reporting manager is set.</span> New employees onboarded without a manager
      are refused unless the person uploading qualifies as the fallback.{" "}
      {canConfigure ? (
        <Link href="/hr/settings/reporting-managers" className="font-medium underline underline-offset-2">
          Set the reporting manager policy
        </Link>
      ) : null}
    </div>
  );
}

interface CoverageTableProps {
  view: CoverageView;
  data: ManagerCoverageReport;
  canEdit: boolean;
  canReview: boolean;
  memberNameMap: Map<string, string>;
}

function CoverageTable({ view, data, canEdit, canReview, memberNameMap }: CoverageTableProps) {
  const common = { className: "flex-1 min-h-0", pagination: { pageSize: 25 } };
  switch (view) {
    case "withoutManager":
      return (
        <DataTable
          {...common}
          data={data.withoutManager}
          columns={canEdit ? [...WITHOUT_MANAGER_COLUMNS, WITHOUT_MANAGER_ASSIGN_COLUMN] : WITHOUT_MANAGER_COLUMNS}
          mobileCard={withoutManagerCard(canEdit)}
          getRowKey={(row) => row.employmentId}
          emptyState={<EmptyState className={TABLE_EMPTY_CLASS} title="Everyone has a manager" description="Every active employee reports to someone or is a declared top-level role." />}
        />
      );
    case "fallback":
      return (
        <DataTable
          {...common}
          data={data.fallback ?? []}
          columns={canEdit ? [...FALLBACK_COLUMNS, FALLBACK_ACTION_COLUMN] : FALLBACK_COLUMNS}
          mobileCard={fallbackCard(canEdit)}
          getRowKey={(row, index) => `${row.userId ?? "employee"}-${index}`}
          emptyState={<EmptyState className={TABLE_EMPTY_CLASS} title="No temporary managers" description="Nobody is waiting on a manager assigned by the onboarding policy." />}
        />
      );
    case "pendingReview":
      return (
        <DataTable
          {...common}
          data={data.pendingReview ?? []}
          columns={pendingReviewColumns(canReview)}
          mobileCard={pendingReviewCard(canReview)}
          getRowKey={(row) => row.requestId}
          emptyState={<EmptyState className={TABLE_EMPTY_CLASS} title="No reviews pending" description="No employee has asked HR to check their manager." />}
        />
      );
    case "inactiveManager":
      return (
        <DataTable
          {...common}
          data={data.inactiveManager}
          columns={canEdit ? [...INACTIVE_MANAGER_COLUMNS, INACTIVE_MANAGER_ASSIGN_COLUMN] : INACTIVE_MANAGER_COLUMNS}
          mobileCard={inactiveManagerCard(canEdit)}
          getRowKey={(row, index) => `${row.userId ?? "employee"}-${index}`}
          emptyState={<EmptyState className={TABLE_EMPTY_CLASS} title="All managers are active" description="No employee reports to an exited, suspended or deactivated manager." />}
        />
      );
    case "circular":
      return (
        <DataTable
          {...common}
          data={circularChainRows(data, memberNameMap)}
          columns={CIRCULAR_COLUMNS}
          getRowKey={(row) => row.key}
          emptyState={<EmptyState className={TABLE_EMPTY_CLASS} title="No circular reporting lines" description="No chain of managers loops back on itself." />}
        />
      );
    case "overSpan":
      return (
        <DataTable
          {...common}
          data={data.overSpan}
          columns={OVER_SPAN_COLUMNS}
          getRowKey={(row, index) => `${row.managerUserId ?? "manager"}-${index}`}
          emptyState={<EmptyState className={TABLE_EMPTY_CLASS} title="Spans of control are within limits" description={`No manager has more than ${data.spanOfControlLimit} direct reports.`} />}
        />
      );
  }
}

export function ManagerCoveragePage() {
  const { data, isLoading, isError, error, refetch } = useManagerCoverage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = parseView(searchParams.get("view"));
  const canEdit = useCan("hr:reporting-lines:manage");
  const canReview = useCan("hr:reporting-lines:review");
  const pageState = usePageState({ permission: "hr:employees:view", module: "hr", isLoading, isError, error });
  // Names for loop members the read model did not name (older payloads carry ids only).
  const unnamed = (data?.circular ?? []).filter((cycle) => !cycle.members).flatMap((cycle) => cycle.userIds);
  const { data: cycleMembers } = useOrgMembersByIds([...new Set(unnamed)].slice(0, 100));

  function handleRetry() {
    void refetch();
  }

  function handleViewChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", parseView(value));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const actions = canEdit ? (
    <Button asChild variant="outline" size="sm">
      <Link href="/hr/employees/reporting-changes">Bulk reporting change</Link>
    </Button>
  ) : undefined;

  if (pageState.kind !== "ready" || !data) {
    return (
      <PageWrapper title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
        <PageState resolution={pageState} loading={<LoadingBody />} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  const summary = data.summary;
  const counts: Record<CoverageView, number> = {
    withoutManager: summary.withoutManager,
    fallback: summary.fallback ?? data.fallback?.length ?? 0,
    pendingReview: summary.pendingReview ?? data.pendingReview?.length ?? 0,
    inactiveManager: summary.inactiveManager,
    circular: summary.circular,
    overSpan: summary.overSpan,
  };
  const healthy = Object.values(counts).every((count) => count === 0);
  const topLevel = summary.topLevel ?? 0;

  return (
    <PageWrapper title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} actions={actions} contentClassName="flex min-h-0 flex-1 flex-col gap-4">
      {data.policyMissing ? <PolicyMissingCallout canConfigure={canEdit} /> : null}
      {/* 2 / 3 / 6 columns; short labels so none truncates, the hint carries the detail. */}
      <div data-testid="coverage-summary" className={SUMMARY_GRID_CLASS}>
        <StatCard label="No manager" value={counts.withoutManager} icon={UserX} tone={counts.withoutManager > 0 ? "red" : "emerald"} hint={`${summary.withManager} of ${summary.employees} covered${topLevel > 0 ? ` · ${topLevel} top-level by design` : ""}`} />
        <StatCard label="Fallback" value={counts.fallback} icon={Hourglass} tone={counts.fallback > 0 ? "amber" : "emerald"} hint="Temporary manager" />
        <StatCard label="In review" value={counts.pendingReview} icon={MessageSquareWarning} tone={counts.pendingReview > 0 ? "amber" : "emerald"} hint="Employee asked HR" />
        <StatCard label="Inactive" value={counts.inactiveManager} icon={UserMinus} tone={counts.inactiveManager > 0 ? "amber" : "emerald"} hint="Manager has left" />
        <StatCard label="Circular" value={counts.circular} icon={Repeat} tone={counts.circular > 0 ? "red" : "emerald"} hint="Reporting loops" />
        <StatCard label="Over span" value={counts.overSpan} icon={Users} tone={counts.overSpan > 0 ? "amber" : "emerald"} hint={`Over ${data.spanOfControlLimit} reports`} />
      </div>
      {healthy ? (
        <EmptyState
          className="flex-1 min-h-0"
          title="Every employee has an accountable manager"
          description="No missing, temporary, inactive or circular reporting lines, no pending reviews, and no manager over the span-of-control limit."
        />
      ) : (
        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
            <div className="p-3">
              <Select value={view} onValueChange={handleViewChange}>
                <SelectTrigger className="w-full sm:w-72" aria-label="Coverage category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIEWS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} ({counts[option.value]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CoverageTable view={view} data={data} canEdit={canEdit} canReview={canReview} memberNameMap={memberNames(cycleMembers?.data)} />
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
