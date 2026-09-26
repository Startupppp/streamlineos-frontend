"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { useTestRuns, useDeleteTestRun } from "@/hooks/api/build/qa";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useCursorPager } from "@/components/ui/table-pagination";
import type { TestRunListItem } from "@/types/projects";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { TestRunSheet } from "./test-run-sheet";

const RUN_PAGE_SIZE = 50;

const RUN_STATUS_STYLES: Record<string, string> = {
  not_started: "text-muted-foreground border-border",
  in_progress: "text-status-info-ink-strong border-status-info-rule",
  completed: "text-status-success-ink-strong border-status-success-rule",
  aborted: "text-status-danger-ink-strong border-status-danger-rule",
};

const RUN_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  aborted: "Aborted",
};

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "aborted", label: "Aborted" },
];

const FILTER_DEFINITIONS = [
  {
    param: "status",
    options: STATUS_OPTIONS.map((o) => o.value),
  },
] as const;

const TEST_RUN_TABLE_HEADERS = [
  "Run",
  "Name",
  "Status",
  "Environment",
  "Progress",
  "Actions",
] as const;

function runStatusLabel(status: string): string {
  return RUN_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

function runStatusStyle(status: string): string {
  return RUN_STATUS_STYLES[status] ?? "text-muted-foreground border-border";
}

function RunStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-micro", runStatusStyle(status))}
    >
      {runStatusLabel(status)}
    </Badge>
  );
}

function RunProgress({ run }: { run: TestRunListItem }) {
  const total =
    run.passCount +
    run.failCount +
    run.blockedCount +
    run.notRunCount +
    run.skippedCount;

  if (total === 0)
    return <span className="text-dense text-muted-foreground">—</span>;

  const pct = Math.round((run.passCount / total) * 100);
  return (
    <div className="flex min-w-[80px] items-center gap-1.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-status-success-fill transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-micro tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </div>
  );
}

function NewRunButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      New Test Run
    </Button>
  );
}

function RunDeleteButton({
  run,
  onDelete,
}: {
  run: TestRunListItem;
  onDelete: (r: TestRunListItem) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleDelete = useCallback(() => onDelete(run), [run, onDelete]);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-muted-foreground hover:text-destructive"
      aria-label={`Delete ${run.name}`}
      onClick={handleDelete}
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={14} />
    </Button>
  );
}

interface TestRunsTabProps {
  projectId: number;
}

export function TestRunsTab({ projectId }: TestRunsTabProps) {
  const router = useRouter();
  const canManage = useCan("build:qa:manage");
  const listFilters = useBuildListFilters({
    filters: FILTER_DEFINITIONS,
    withSearch: false,
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TestRunListItem | null>(
    null,
  );

  const { cursor, hasPrevious, goNext, goPrevious } = useCursorPager(
    listFilters.resetKey,
  );

  const statusValue = listFilters.value("status");
  const queryFilters = {
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
    cursor: cursor !== undefined ? Number(cursor) : undefined,
  };
  const {
    data: runsPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useTestRuns(projectId, queryFilters);
  const runs = runsPage?.data ?? [];
  const deleteRun = useDeleteTestRun();

  const handleDeleteRow = useCallback(
    (r: TestRunListItem) => setDeleteTarget(r),
    [],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteRun.mutate(
      { projectId, id: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success("Test run deleted");
          setDeleteTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [deleteTarget, deleteRun, projectId]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleNewRun = useCallback(() => {
    setSheetOpen(true);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleNextPage = useCallback(() => {
    goNext(
      runsPage?.nextCursor == null ? null : String(runsPage.nextCursor),
    );
  }, [goNext, runsPage]);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleOpenFocused = useCallback(
    (index: number) => { router.push(`/build/${projectId}/qa/runs/${runs[index].id}`); },
    [runs, projectId, router],
  );
  const handleClearKeyboardSelection = useCallback(() => {}, []);
  useBuildListKeyboard({
    itemCount: runs.length,
    onOpen: handleOpenFocused,
    onCreate: canManage ? handleNewRun : undefined,
    onClearSelection: handleClearKeyboardSelection,
    enabled: !sheetOpen && !deleteTarget,
  });

  const pageState = usePageState({
    permission: "build:qa:view",
    isLoading,
    isError,
    error,
  });

  const columns = useMemo<DataTableColumn<TestRunListItem>[]>(
    () => [
      {
        key: "runNumber",
        header: "Run",
        cell: (row) => (
          <Link
            href={`/build/${projectId}/qa/runs/${row.id}`}
            className="font-mono text-dense text-primary hover:underline"
          >
            Run #{row.runNumber}
          </Link>
        ),
        className: "w-[80px]",
      },
      {
        key: "name",
        header: "Name",
        className: TABLE_TITLE_CELL,
        cell: (row) => (
          <Link
            href={`/build/${projectId}/qa/runs/${row.id}`}
            className="text-dense font-medium hover:underline min-w-0 block"
          >
            <TruncatedText text={row.name} />
          </Link>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => <RunStatusBadge status={row.status} />,
        className: "w-[110px]",
      },
      {
        key: "environment",
        header: "Environment",
        cell: (row) => (
          <TruncatedText
            text={row.environment ?? "—"}
            className="max-w-[7rem] text-dense text-muted-foreground"
          />
        ),
        className: "w-[110px]",
      },
      {
        key: "progress",
        header: "Progress",
        cell: (row) => <RunProgress run={row} />,
        className: "w-[120px]",
      },
      {
        key: "actions",
        header: "Actions",
        headerClassName: "sr-only",
        cell: (row) =>
          canManage ? (
            <RunDeleteButton run={row} onDelete={handleDeleteRow} />
          ) : null,
        className: "w-[40px]",
      },
    ],
    [canManage, projectId, handleDeleteRow],
  );

  const renderMobileCard = useCallback(
    (row: TestRunListItem) => (
      <BuildMobileCard
        title={row.name}
        status={<RunStatusBadge status={row.status} />}
        meta={[
          { label: "Environment", value: row.environment ?? "—" },
          { label: "Progress", value: <RunProgress run={row} /> },
        ]}
        actions={
          canManage ? (
            <RunDeleteButton run={row} onDelete={handleDeleteRow} />
          ) : null
        }
      />
    ),
    [canManage, handleDeleteRow],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-start gap-2">
        <BuildListToolbar
          filters={[
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusValue}
                  onValueChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
          className="flex-1 min-w-0"
        />
        {canManage ? <NewRunButton onClick={handleNewRun} /> : null}
      </div>

      <PageState
        resolution={pageState}
        loading={
          <DataTableSkeleton mobileCards
            rows={12}
            headers={TEST_RUN_TABLE_HEADERS}
            className="flex-1"
          />
        }
        empty={
          <EmptyState
            illustrationPreset="ticket"
            title="No test runs"
            description="Create a test run to start executing tests."
            filtersActive={listFilters.isFiltered}
            onClearFilters={listFilters.clearAll}
            action={
              canManage
                ? { label: "New Test Run", onClick: handleNewRun }
                : undefined
            }
            className="flex-1"
          />
        }
        onRetry={handleRetry}
        className="flex-1 min-h-0"
      >
        <DataTable<TestRunListItem>
          data={runs}
          columns={columns}
          getRowKey={(row) => row.id}
          mobileCard={renderMobileCard}
          className="flex-1 min-h-0"
          pagination={{
            mode: "cursor",
            pageSize: RUN_PAGE_SIZE,
            hasMore: runsPage?.hasMore ?? false,
            hasPrevious,
            onNext: handleNextPage,
            onPrevious: goPrevious,
          }}
        />
      </PageState>

      <TestRunSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete test run?"
        description={`${deleteTarget?.name ?? `Run #${deleteTarget?.runNumber ?? ""}`} will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
