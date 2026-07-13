"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Bug as BugIcon } from "lucide-react";
import { useUpdateTestResult } from "@/hooks/api/projects/qa";
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

export const ResultRow = memo(function ResultRow({ result, projectId, canExecute, canCreateBug, onCreateBug }: ResultRowProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(result.notes ?? "");
  const updateResult = useUpdateTestResult();

  function handleStatusChange(status: TestResultStatus) {
    if (!canExecute) return;
    updateResult.mutate(
      { projectId, runId: result.runId, resultId: result.id, status, notes: notes || undefined },
      {
        onSuccess: () => toast.success("Result updated"),
        onError: () => toast.error("Failed to update result"),
      },
    );
    if (status === "failed") setNotesOpen(true);
  }

  function handleNotesSave() {
    updateResult.mutate(
      { projectId, runId: result.runId, resultId: result.id, status: result.status, notes: notes || undefined },
      { onSuccess: () => toast.success("Notes saved"), onError: () => toast.error("Failed to save notes") },
    );
  }

  const tc = result.testCase;

  return (
    <div className="border rounded-lg px-3 py-2.5 space-y-2 bg-card">
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
          TC-{tc?.caseNumber ?? result.testCaseId}
        </span>
        <span className="text-[11px] font-medium flex-1 min-w-0">{tc?.title ?? "Test case"}</span>
        {tc?.priority && (
          <Badge variant="outline" className={`text-[10px] shrink-0 ${PRIORITY_STYLES[tc.priority]}`}>
            {tc.priority}
          </Badge>
        )}
        {result.linkedBugId && (
          <Link
            href={`/projects/${projectId}/bugs`}
            className="text-[10px] text-primary font-mono hover:underline shrink-0"
          >
            BUG-{result.linkedBugId}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = result.status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={!canExecute || updateResult.isPending}
              onClick={() => handleStatusChange(opt.value)}
              className={cn(
                "px-2 py-0.5 text-[10px] border rounded transition-colors",
                isActive
                  ? opt.activeClass
                  : "border-border text-muted-foreground hover:bg-muted disabled:opacity-50",
              )}
            >
              {opt.label}
            </button>
          );
        })}

        <button
          type="button"
          className="ml-1 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => setNotesOpen((p) => !p)}
        >
          {notesOpen ? "Hide notes" : "Notes"}
        </button>

        {canCreateBug && result.status === "failed" && !result.linkedBugId && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] ml-auto border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            onClick={() => onCreateBug(result.id)}
          >
            <BugIcon className="h-3 w-3 mr-1" />
            Create Bug
          </Button>
        )}
      </div>

      {notesOpen && (
        <div className="space-y-1.5">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add execution notes..."
            className="text-[11px] min-h-[56px] resize-none"
            disabled={!canExecute}
          />
          {canExecute && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[10px]"
              onClick={handleNotesSave}
              disabled={updateResult.isPending}
            >
              Save notes
            </Button>
          )}
        </div>
      )}
    </div>
  );
});
