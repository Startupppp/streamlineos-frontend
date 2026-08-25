"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useTestRuns, useDeleteTestRun } from "@/hooks/api/build/qa";
import { useCan } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { TestRun, TestRunStatus, TestRunCounts } from "@/types/projects";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { TestRunSheet } from "./test-run-sheet";

const RUN_STATUS_STYLES: Record<TestRunStatus, string> = {
  not_started: "text-muted-foreground border-border",
  in_progress: "text-status-info-ink border-status-info-rule",
  completed: "text-status-success-ink border-status-success-rule",
  aborted: "text-status-danger-ink border-status-danger-rule",
};

const RUN_STATUS_LABELS: Record<TestRunStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  aborted: "Aborted",
};

function RunProgress({ counts }: { counts?: TestRunCounts }) {
  if (!counts || counts.total === 0) {
    return <span className="text-dense text-muted-foreground">—</span>;
  }
  const pct = Math.round((counts.passed / counts.total) * 100);
  return (
    <div className="flex min-w-[80px] items-center gap-1.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-micro tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

function NewRunButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="ml-auto h-7 gap-1 text-dense" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      New Test Run
    </Button>
  );
}

function RunActions({ onDelete }: { onDelete: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-muted-foreground hover:text-destructive"
      aria-label="Delete test run"
      onClick={onDelete}
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
  const canManage = useCan("build:qa:manage");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TestRun | null>(null);

  const filters = statusFilter !== "all" ? { status: statusFilter } : undefined;
  const { data: runs, isLoading, isError, refetch } = useTestRuns(projectId, filters);
  const deleteRun = useDeleteTestRun();

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteRun.mutate(
      { projectId, id: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success("Test run deleted");
          setDeleteTarget(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
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

  const columns = useMemo<DataTableColumn<TestRun>[]>(() => [
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
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn("text-micro", RUN_STATUS_STYLES[row.status])}
        >
          {RUN_STATUS_LABELS[row.status]}
        </Badge>
      ),
      className: "w-[110px]",
    },
    {
      key: "environment",
      header: "Environment",
      cell: (row) => (
        <TruncatedText text={row.environment ?? "—"} className="max-w-[7rem] text-dense text-muted-foreground" />
      ),
      className: "w-[110px]",
    },
    {
      key: "progress",
      header: "Progress",
      cell: (row) => <RunProgress counts={row.counts} />,
      className: "w-[120px]",
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        canManage ? (
          <RunActions onDelete={() => setDeleteTarget(row)} />
        ) : null,
      className: "w-[40px]",
    },
  ], [canManage, projectId]);

  if (isLoading) return <DataTableSkeleton rows={12} columns={5} className="flex-1" />;
  if (isError) return <ErrorState onRetry={handleRetry} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="aborted">Aborted</SelectItem>
          </SelectContent>
        </Select>
        {canManage ? <NewRunButton onClick={handleNewRun} /> : null}
      </div>

      {(runs ?? []).length === 0 ? (
        <EmptyState
          illustrationPreset="ticket"
          title="No test runs"
          description="Create a test run to start executing tests."
          action={canManage ? { label: "New Test Run", onClick: handleNewRun } : undefined}
          className="min-h-[32dvh] flex-1"
        />
      ) : (
        <DataTable<TestRun>
          data={runs ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
          className="min-h-0 flex-1"
        />
      )}

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
        onConfirm={handleDelete}
      />
    </div>
  );
}
