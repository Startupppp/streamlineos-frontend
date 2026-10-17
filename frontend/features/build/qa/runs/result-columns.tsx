"use client";

import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { TestRunResult, TestResultStatus } from "@/types/projects";
import { useUpdateTestResult } from "@/hooks/api/build/qa";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Bug as BugIcon } from "lucide-react";
import Link from "next/link";
import { PRIORITY_STYLES, ResultStatusButtons, linkedBugHref } from "./result-status-buttons";

function ResultStatusCell({
  result,
  projectId,
  canExecute,
}: {
  result: TestRunResult;
  projectId: number;
  canExecute: boolean;
}) {
  const updateResult = useUpdateTestResult();

  const handleStatusChange = useCallback(
    (status: TestResultStatus) => {
      if (!canExecute) return;
      updateResult.mutate(
        { projectId, runId: result.runId, resultId: result.id, status },
        {
          onSuccess: () => toast.success("Result updated"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [canExecute, projectId, result.id, result.runId, updateResult],
  );

  return (
    <div className="flex flex-wrap gap-0.5">
      <ResultStatusButtons
        status={result.status}
        disabled={!canExecute || updateResult.isPending}
        onSelect={handleStatusChange}
      />
    </div>
  );
}

function ResultActionsCell({
  result,
  projectId,
  canCreateBug,
  onCreateBug,
  onOpenNotes,
}: {
  result: TestRunResult;
  projectId: number;
  canCreateBug: boolean;
  onCreateBug: (resultId: number) => void;
  onOpenNotes: (result: TestRunResult) => void;
}) {
  const handleCreateBug = useCallback(() => onCreateBug(result.id), [onCreateBug, result.id]);
  const handleOpenNotes = useCallback(() => onOpenNotes(result), [onOpenNotes, result]);

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-1.5 text-micro text-muted-foreground hover:text-foreground"
        onClick={handleOpenNotes}
      >
        Notes{result.notes ? " ✓" : ""}
      </Button>
      {result.linkedWorkItemId ? (
        <Link
          href={linkedBugHref(projectId, result.linkedWorkItemId)}
          className="text-micro font-medium text-primary hover:underline"
        >
          Bug
        </Link>
      ) : canCreateBug && result.status === "failed" ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-micro text-destructive hover:bg-destructive/10"
          onClick={handleCreateBug}
        >
          <BugIcon className="mr-0.5 h-2.5 w-2.5" />
          File
        </Button>
      ) : null}
    </div>
  );
}

interface BuildResultColumnsOptions {
  projectId: number;
  canExecute: boolean;
  canCreateBug: boolean;
  onCreateBug: (resultId: number) => void;
  onOpenNotes: (result: TestRunResult) => void;
}

export function buildResultColumns({
  projectId,
  canExecute,
  canCreateBug,
  onCreateBug,
  onOpenNotes,
}: BuildResultColumnsOptions): DataTableColumn<TestRunResult>[] {
  return [
    {
      key: "caseNumber",
      header: "TC#",
      className: "w-[60px]",
      cell: (row) => (
        <span className="font-mono text-micro text-muted-foreground">
          {row.testCase ? `TC-${row.testCase.caseNumber}` : "—"}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      cell: (row) => (
        <TruncatedText
          text={row.testCase?.title ?? "—"}
          className="text-xs font-medium"
        />
      ),
    },
    {
      key: "priority",
      header: "Priority",
      className: "w-[80px]",
      cell: (row) =>
        row.testCase?.priority ? (
          <Badge
            variant="outline"
            className={cn("text-micro capitalize", PRIORITY_STYLES[row.testCase.priority])}
          >
            {row.testCase.priority}
          </Badge>
        ) : (
          <span className="text-micro text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[280px]",
      cell: (row) => (
        <ResultStatusCell
          result={row}
          projectId={projectId}
          canExecute={canExecute}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-[140px]",
      cell: (row) => (
        <ResultActionsCell
          result={row}
          projectId={projectId}
          canCreateBug={canCreateBug}
          onCreateBug={onCreateBug}
          onOpenNotes={onOpenNotes}
        />
      ),
    },
  ];
}
