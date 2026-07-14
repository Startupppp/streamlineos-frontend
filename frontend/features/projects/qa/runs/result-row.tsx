"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Bug as BugIcon } from "lucide-react";
import { useUpdateTestResult } from "@/hooks/api/projects/qa";
import { getErrorMessage } from "@/lib/get-error-message";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { PM_PANEL } from "@/features/projects/shared/pm-chrome";
import type { TestRunResult, TestResultStatus, TestCasePriority } from "@/types/projects";

const STATUS_OPTIONS: { value: TestResultStatus; label: string; activeClass: string }[] = [
  { value: "not_run", label: "Not Run", activeClass: "bg-muted text-foreground border-border dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30" },
  { value: "passed", label: "Pass", activeClass: "bg-green-50 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30" },
  { value: "failed", label: "Fail", activeClass: "bg-red-50 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30" },
  { value: "blocked", label: "Blocked", activeClass: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  { value: "skipped", label: "Skip", activeClass: "bg-muted text-muted-foreground border-border dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30" },
];

const PRIORITY_STYLES: Record<TestCasePriority, string> = {
  low: "text-muted-foreground border-border",
  medium: "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30",
  high: "text-red-600 border-red-200 dark:text-red-400 dark:border-red-500/30",
};

interface ResultRowProps {
  result: TestRunResult;
  projectId: number;
  canExecute: boolean;
  canCreateBug: boolean;
  onCreateBug: (resultId: number) => void;
}

export const ResultRow = memo(function ResultRow({
  result,
  projectId,
  canExecute,
  canCreateBug,
  onCreateBug,
}: ResultRowProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(result.notes ?? "");
  const updateResult = useUpdateTestResult();

  function handleStatusChange(status: TestResultStatus) {
    if (!canExecute) return;
    updateResult.mutate(
      { projectId, runId: result.runId, resultId: result.id, status, notes: notes || undefined },
      {
        onSuccess: () => toast.success("Result updated"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
    if (status === "failed") setNotesOpen(true);
  }

  function handleNotesSave() {
    updateResult.mutate(
      { projectId, runId: result.runId, resultId: result.id, status: result.status, notes: notes || undefined },
      {
        onSuccess: () => toast.success("Notes saved"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleToggleNotes() {
    setNotesOpen((prev) => !prev);
  }

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNotes(e.target.value);
  }

  function handleCreateBugClick() {
    onCreateBug(result.id);
  }

  const tc = result.testCase;
  const caseLabel = tc ? `TC-${tc.caseNumber}` : "Test case";
  const title = tc?.title ?? "Test case";

  return (
    <div className={cn(PM_PANEL, "space-y-2 px-3 py-2.5")}>
      <div className="flex min-w-0 flex-wrap items-start gap-2">
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
          {caseLabel}
        </span>
        <span className={cn(TEXT_ONE_LINE, "min-w-0 flex-1 text-[11px] font-medium")} title={title}>
          {title}
        </span>
        {tc?.priority ? (
          <Badge variant="outline" className={cn("shrink-0 text-[10px] capitalize", PRIORITY_STYLES[tc.priority])}>
            {tc.priority}
          </Badge>
        ) : null}
        {result.linkedBugId ? (
          <Link
            href={`/projects/${projectId}/bugs`}
            className="shrink-0 text-[10px] font-medium text-primary hover:underline"
          >
            Linked bug
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = result.status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={!canExecute || updateResult.isPending}
              onClick={() => handleStatusChange(opt.value)}
              className={cn(
                "rounded border px-2 py-0.5 text-[10px] transition-colors",
                isActive
                  ? opt.activeClass
                  : "border-border text-muted-foreground hover:bg-primary/[0.04] disabled:opacity-50",
              )}
            >
              {opt.label}
            </button>
          );
        })}

        <button
          type="button"
          className="ml-1 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={handleToggleNotes}
        >
          {notesOpen ? "Hide notes" : "Notes"}
        </button>

        {canCreateBug && result.status === "failed" && !result.linkedBugId ? (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-6 border-red-200 text-[10px] text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            onClick={handleCreateBugClick}
          >
            <BugIcon className="mr-1 h-3 w-3" />
            Create Bug
          </Button>
        ) : null}
      </div>

      {notesOpen ? (
        <div className="space-y-1.5">
          <Textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Add execution notes..."
            className="min-h-[56px] resize-none text-[11px]"
            disabled={!canExecute}
          />
          {canExecute ? (
            <LoadingButton
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[10px]"
              onClick={handleNotesSave}
              isPending={updateResult.isPending}
              loadingText="Saving…"
            >
              Save notes
            </LoadingButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
