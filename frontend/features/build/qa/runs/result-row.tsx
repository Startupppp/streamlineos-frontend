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
import { useUpdateTestResult } from "@/hooks/api/build/qa";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { PM_PANEL } from "@/components/pm-chrome";
import type { TestRunResult, TestResultStatus } from "@/types/projects";
import { PRIORITY_STYLES, ResultStatusButtons, linkedBugHref } from "./result-status-buttons";

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
        <span className="shrink-0 font-mono text-dense text-muted-foreground">
          {caseLabel}
        </span>
        <TruncatedText text={title} className="min-w-0 flex-1 text-dense font-medium" />
        {tc?.priority ? (
          <Badge variant="outline" className={cn("shrink-0 text-micro capitalize", PRIORITY_STYLES[tc.priority])}>
            {tc.priority}
          </Badge>
        ) : null}
        {result.linkedWorkItemId ? (
          <Link
            href={linkedBugHref(projectId, result.linkedWorkItemId)}
            className="shrink-0 text-micro font-medium text-primary hover:underline"
          >
            Linked bug
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <ResultStatusButtons
          status={result.status}
          disabled={!canExecute || updateResult.isPending}
          onSelect={handleStatusChange}
          buttonClassName="px-2"
        />

        <button
          type="button"
          className="ml-1 text-micro text-muted-foreground hover:text-foreground"
          onClick={handleToggleNotes}
        >
          {notesOpen ? "Hide notes" : "Notes"}
        </button>

        {canCreateBug && result.status === "failed" && !result.linkedWorkItemId ? (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-6 border-destructive/30 text-micro text-destructive hover:bg-destructive/10"
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
            className="min-h-[56px] resize-none text-dense"
            disabled={!canExecute}
          />
          {canExecute ? (
            <LoadingButton
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-micro"
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
