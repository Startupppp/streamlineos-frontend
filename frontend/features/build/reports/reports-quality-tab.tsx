"use client";

import Link from "next/link";
import { useTestRuns } from "@/hooks/api/build/qa";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { TestRunListItem } from "@/types/projects";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { useBuildCursorPager, BUILD_CURSOR_STACK_PARAM } from "@/features/build/shared/use-build-cursor-pager";
import { BUILD_FILTER_ALL, useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useUrlFilters } from "@/lib/url-state/use-url-filters";

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "aborted", label: "Aborted" },
];
const FILTERS = [
  { param: "status", options: STATUS_OPTIONS.map((option) => option.value) },
  { param: "failuresOnly", options: ["true"] },
];
const RESULT_COLUMNS = [
  { key: "passCount", header: "Passed" },
  { key: "failCount", header: "Failed" },
  { key: "blockedCount", header: "Blocked" },
  { key: "notRunCount", header: "Not run" },
  { key: "skippedCount", header: "Skipped" },
] as const;

interface ReportsQualityTabProps {
  projectId: number;
}

export function ReportsQualityTab({ projectId }: ReportsQualityTabProps) {
  const filters = useBuildListFilters({ filters: FILTERS });
  const pager = useBuildCursorPager(filters.resetKey);
  const { update } = useUrlFilters({ pageParam: BUILD_CURSOR_STACK_PARAM });
  const status = filters.value("status");
  const failuresOnly = filters.value("failuresOnly") === "true";
  const { data: page, isLoading, isError, error, refetch } = useTestRuns(projectId, {
    q: filters.debouncedSearch || undefined,
    status: status === BUILD_FILTER_ALL ? undefined : status,
    failuresOnly: failuresOnly || undefined,
    cursor: pager.cursor === undefined ? undefined : Number(pager.cursor),
  });
  const runs = page?.data ?? [];
  const resolution = usePageState({ permission: "build:qa:view", isLoading, isError, error });
  function handleRetry() { void refetch(); }
  function handleStatus(value: string) {
    update({ status: value === BUILD_FILTER_ALL ? null : value, cursor: null,
      failuresOnly: value === "completed" && failuresOnly ? "true" : null });
  }
  function handleFailures(checked: boolean) {
    update({ failuresOnly: checked ? "true" : null, status: checked ? "completed" : status === BUILD_FILTER_ALL ? null : status, cursor: null });
  }
  function handleNext() {
    pager.goNext(page?.nextCursor == null ? null : String(page.nextCursor));
  }
  function getRowKey(run: TestRunListItem) { return run.id; }
  function renderRun(run: TestRunListItem) { return (
    <Link className="font-medium hover:underline" href={`/build/${projectId}/qa/runs/${run.id}`}>
      {run.name}
    </Link>
  ); }
  function renderStatus(run: TestRunListItem) { return (
    STATUS_OPTIONS.find((option) => option.value === run.status)?.label ?? run.status
  ); }
  function renderEnvironment(run: TestRunListItem) { return run.environment ?? "—"; }
  function resultColumn(column: typeof RESULT_COLUMNS[number]): DataTableColumn<TestRunListItem> {
    function renderCount(run: TestRunListItem) { return <span className="tabular-nums">{run[column.key]}</span>; }
    return { ...column, cell: renderCount };
  }
  const columns: DataTableColumn<TestRunListItem>[] = [
    { key: "name", header: "Test run", cell: renderRun },
    { key: "status", header: "Status", cell: renderStatus },
    { key: "environment", header: "Environment", cell: renderEnvironment },
    ...RESULT_COLUMNS.map(resultColumn),
  ];
  function renderMobile(run: TestRunListItem) {
    function resultMeta(column: typeof RESULT_COLUMNS[number]) {
      return { label: column.header, value: <span className="tabular-nums">{run[column.key]}</span> };
    }
    return (
    <BuildMobileCard title={renderRun(run)} status={renderStatus(run)} meta={[
      { label: "Environment", value: run.environment ?? "—" },
      ...RESULT_COLUMNS.map(resultMeta),
    ]} />
  ); }
  function renderSummary(column: typeof RESULT_COLUMNS[number]) { return (
    <StatCard key={column.key} label={column.header}
      value={runs.reduce((sum, run) => sum + run[column.key], 0)}
      hint="Displayed page" />
  ); }

  return (
    <PageState resolution={resolution} loading={<Skeleton className="h-72 w-full rounded-xl" />} onRetry={handleRetry}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">Quality results</h2>
          <p className="text-sm text-muted-foreground">Counts cover the displayed page of test runs. Each result belongs to its run; cases may appear in multiple runs.</p>
        </div>
        {runs.length > 0 && <StatCardGrid cols={5} stackOnMobile={2}>{RESULT_COLUMNS.map(renderSummary)}</StatCardGrid>}
        <BuildListToolbar search={{ value: filters.search, onValueChange: filters.setSearch, placeholder: "Search test runs…" }}
          filters={[
            { id: "status", label: "Status", active: filters.isActive("status"), control: <BuildFilterSelect label="Status" value={status} onValueChange={handleStatus} options={STATUS_OPTIONS} /> },
            { id: "failuresOnly", label: "Completed runs with failures", active: failuresOnly, control: <Label className="font-normal"><Switch aria-label="Completed runs with failures" checked={failuresOnly} onCheckedChange={handleFailures} /><span className="hidden md:inline">Completed runs with failures</span></Label> },
          ]} onClearAll={filters.clearAll}
          trailing={filters.isFiltered ? <Button type="button" variant="outline" onClick={filters.clearAll}>Clear filters</Button> : undefined} />
        <BuildListSurface permission="build:qa:view" rows={runs} columns={columns}
          isLoading={isLoading} isError={isError} error={error} isFiltered={filters.isFiltered}
          getRowKey={getRowKey} mobileCard={renderMobile} onRetry={handleRetry}
          pagination={{ mode: "cursor", pageSize: 50, pageNumber: pager.pageNumber,
            hasMore: page?.hasMore ?? false, hasPrevious: pager.hasPrevious,
            onNext: handleNext, onPrevious: pager.goPrevious }}
          empty={<EmptyState illustrationPreset="chart" title="No test runs" description="Quality results will appear once this project has test runs." action={{ label: "Open QA", href: `/build/${projectId}/qa` }} />}
          filteredEmpty={<EmptyState illustrationPreset="chart" title="No test runs match your filters" description="Clear the filters to see other test runs." onClearFilters={filters.clearAll} />}
        />
      </div>
    </PageState>
  );
}
