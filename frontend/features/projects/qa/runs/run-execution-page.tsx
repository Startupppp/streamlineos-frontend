"use client";

import { useState } from "react";
import { useTestRunDetail, useUpdateTestRun, useCreateBugFromResult } from "@/hooks/api/projects/qa";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ResultRow } from "./result-row";
import type { TestRunStatus, TestRunCounts } from "@/types/projects";

const STATUS_STYLES: Record<TestRunStatus, string> = {
  not_started: "text-slate-500 border-slate-200",
  in_progress: "text-blue-600 border-blue-200",
  completed: "text-green-600 border-green-200",
  aborted: "text-red-600 border-red-200",
};

const STATUS_LABELS: Record<TestRunStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  aborted: "Aborted",
};

function ProgressBar({ counts }: { counts?: TestRunCounts }) {
  if (!counts || counts.total === 0) return null;
  const pct = Math.round(((counts.passed + counts.failed + counts.blocked + counts.skipped) / counts.total) * 100);
  const passPct = Math.round((counts.passed / counts.total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-[width] duration-300" style={{ width: `${passPct}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground">
        {counts.passed}/{counts.total} passed · {pct}% executed
      </span>
    </div>
  );
}

interface RunExecutionPageProps {
  projectId: number;
  runId: number;
}

export function RunExecutionPage({ projectId, runId }: RunExecutionPageProps) {
  const canManage = useCan("projects:qa:manage");
  const canExecute = useCan("projects:qa:execute");
  const canCreateBug = useCan("projects:bugs:create");

  const { data: run, isLoading, isError, refetch } = useTestRunDetail(projectId, runId);
  const updateRun = useUpdateTestRun();
  const createBugFromResult = useCreateBugFromResult();

  const [bugSheetOpen, setBugSheetOpen] = useState(false);
  const [bugResultId, setBugResultId] = useState<number | null>(null);
  const [bugTitle, setBugTitle] = useState("");
  const [bugSeverity, setBugSeverity] = useState("major");

  function handleCompleteRun() {
    if (!run) return;
    updateRun.mutate(
      { projectId, id: run.id, status: "completed" },
      {
        onSuccess: () => toast.success("Run marked as completed"),
        onError: () => toast.error("Failed to complete run"),
      },
    );
  }

  function handleOpenCreateBug(resultId: number) {
    const result = run?.results.find((r) => r.id === resultId);
    setBugTitle(result?.testCase ? `Bug in TC-${result.testCase.caseNumber}: ${result.testCase.title}` : "");
    setBugResultId(resultId);
    setBugSheetOpen(true);
  }

  function handleSubmitBug() {
    if (!bugResultId) return;
    createBugFromResult.mutate(
      { projectId, runId, resultId: bugResultId, title: bugTitle || undefined, severity: bugSeverity },
      {
        onSuccess: () => { toast.success("Bug created"); setBugSheetOpen(false); setBugResultId(null); },
        onError: () => toast.error("Failed to create bug"),
      },
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Loading..." backHref={`/projects/${projectId}/qa`}>
        <div className="px-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError || !run) {
    return (
      <PageWrapper title="Run" backHref={`/projects/${projectId}/qa`}>
        <div className="px-4">
          <ErrorState onRetry={refetch} />
        </div>
      </PageWrapper>
    );
  }

  const results = run.results ?? [];

  return (
    <PageWrapper
      eyebrow={`Run #${run.runNumber}`}
      title={run.name}
      backHref={`/projects/${projectId}/qa`}
      actions={
        canManage && run.status !== "completed" ? (
          <Button
            size="sm"
            className="h-7 text-[11px]"
            onClick={handleCompleteRun}
            disabled={updateRun.isPending}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Complete Run
          </Button>
        ) : undefined
      }
    >
      <div className="px-4 pb-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[run.status]}`}>
            {STATUS_LABELS[run.status]}
          </Badge>
          {run.environment && (
            <span className="text-[11px] text-muted-foreground">{run.environment}</span>
          )}
          <ProgressBar counts={run.counts} />
        </div>

        {results.length === 0 ? (
          <EmptyState
            illustrationPreset="ticket"
            title="No test results"
            description="No test cases were added to this run."
            compact
          />
        ) : (
          <div className="space-y-2">
            {results.map((result) => (
              <ResultRow
                key={result.id}
                result={result}
                projectId={projectId}
                canExecute={canExecute}
                canCreateBug={canCreateBug}
                onCreateBug={handleOpenCreateBug}
              />
            ))}
          </div>
        )}
      </div>

      <Sheet open={bugSheetOpen} onOpenChange={setBugSheetOpen}>
        <SheetContent className="p-0 flex flex-col w-full sm:max-w-md">
          <SheetHeader className="px-5 py-4 border-b shrink-0">
            <SheetTitle>Create Bug from Result</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="px-5 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Title *</Label>
                <Input
                  value={bugTitle}
                  onChange={(e) => setBugTitle(e.target.value)}
                  className="h-8 text-[11px]"
                  placeholder="Bug title"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Severity</Label>
                <Select value={bugSeverity} onValueChange={setBugSeverity}>
                  <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blocker">Blocker</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="trivial">Trivial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>
          <SheetFooter className="px-5 py-3 border-t shrink-0 flex gap-2">
            <SheetClose asChild>
              <Button variant="outline" size="sm" className="text-[11px]">Cancel</Button>
            </SheetClose>
            <Button
              size="sm"
              className="text-[11px]"
              onClick={handleSubmitBug}
              disabled={createBugFromResult.isPending || !bugTitle.trim()}
            >
              {createBugFromResult.isPending ? "Creating..." : "Create Bug"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
