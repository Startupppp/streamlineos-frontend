"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useTestRuns, useDeleteTestRun } from "@/hooks/api/projects/qa";
import { useCan } from "@/hooks/api/access";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { TestRunSheet } from "./test-run-sheet";

const RUN_STATUS_STYLES: Record<TestRunStatus, string> = {
  not_started: "text-muted-foreground border-border",
  in_progress: "text-blue-600 border-blue-200",
  completed: "text-green-600 border-green-200",
  aborted: "text-red-600 border-red-200",
};

const RUN_STATUS_LABELS: Record<TestRunStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  aborted: "Aborted",
};

function RunProgress({ counts }: { counts?: TestRunCounts }) {
  if (!counts || counts.total === 0) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }
  const pct = Math.round((counts.passed / counts.total) * 100);
  return (
    <div className="flex items-center gap-1.5 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0">{pct}%</span>
    </div>
  );
}

interface TestRunsTabProps {
  projectId: number;
}

export function TestRunsTab({ projectId }: TestRunsTabProps) {
  const canManage = useCan("projects:qa:manage");
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
        onError: () => toast.error("Failed to delete test run"),
      },
    );
  }, [deleteTarget, deleteRun, projectId]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleNewRun = useCallback(() => {
    setSheetOpen(true);
  }, []);

  const columns = useMemo<DataTableColumn<TestRun>[]>(() => [
    {
      key: "runNumber",
      header: "Run",
      cell: (row) => (
        <Link
          href={`/projects/${projectId}/qa/runs/${row.id}`}
          className="text-[11px] font-mono text-primary hover:underline"
        >
          Run #{row.runNumber}
        </Link>
      ),
      className: "w-[80px]",
    },
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <Link
          href={`/projects/${projectId}/qa/runs/${row.id}`}
          className="text-[11px] font-medium hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          variant="outline"
          className={`text-[10px] ${RUN_STATUS_STYLES[row.status]}`}
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
        <span className="text-[11px] text-muted-foreground">{row.environment ?? "—"}</span>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive"
                onSelect={() => setDeleteTarget(row)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
      className: "w-[40px]",
    },
  ], [canManage, projectId]);

  if (isLoading) return <DataTableSkeleton rows={5} columns={5} />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 text-[11px] w-36">
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
        {canManage && (
          <Button size="sm" className="h-7 text-[11px] ml-auto" onClick={handleNewRun}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Test Run
          </Button>
        )}
      </div>

      {(runs ?? []).length === 0 ? (
        <EmptyState
          illustrationPreset="ticket"
          title="No test runs"
          description="Create a test run to start executing tests."
          action={canManage ? { label: "New Test Run", onClick: handleNewRun } : undefined}
          compact
        />
      ) : (
        <DataTable<TestRun>
          data={runs ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
        />
      )}

      <TestRunSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete test run?</AlertDialogTitle>
            <AlertDialogDescription>
              Run #{deleteTarget?.runNumber} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
