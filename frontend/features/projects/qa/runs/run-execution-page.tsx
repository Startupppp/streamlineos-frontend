"use client";

import { useCallback, useState } from "react";
import { useTestRunDetail, useUpdateTestRun, useCreateBugFromResult } from "@/hooks/api/projects/qa";
import { useCan } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CircleCheckIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
  PM_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { ResultRow } from "./result-row";
import type { TestRunStatus, TestRunCounts } from "@/types/projects";

const STATUS_STYLES: Record<TestRunStatus, string> = {
  not_started: "text-muted-foreground border-border",
  in_progress: "text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-500/30",
  completed: "text-green-600 border-green-200 dark:text-green-400 dark:border-green-500/30",
  aborted: "text-red-600 border-red-200 dark:text-red-400 dark:border-red-500/30",
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
      <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${passPct}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {counts.passed}/{counts.total} passed · {pct}% executed
      </span>
    </div>
  );
}

function CompleteRunButton({ onClick, isPending }: { onClick: () => void; isPending: boolean }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      size="sm"
      className="gap-1 text-[11px]"
      onClick={onClick}
      isPending={isPending}
      loadingText="Completing…"
      {...hoverHandlers}
    >
      <CircleCheckIcon ref={iconRef} size={14} />
      Complete Run
    </LoadingButton>
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

  const handleCompleteRun = useCallback(() => {
    if (!run) return;
    updateRun.mutate(
      { projectId, id: run.id, status: "completed" },
      {
        onSuccess: () => toast.success("Run marked as completed"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [run, updateRun, projectId]);

  const handleOpenCreateBug = useCallback((resultId: number) => {
    const result = run?.results.find((r) => r.id === resultId);
    const tc = result?.testCase;
    setBugTitle(tc ? `Bug in TC-${tc.caseNumber}: ${tc.title}` : "");
    setBugResultId(resultId);
    setBugSheetOpen(true);
  }, [run]);

  const handleSubmitBug = useCallback(() => {
    if (!bugResultId) return;
    createBugFromResult.mutate(
      { projectId, runId, resultId: bugResultId, title: bugTitle || undefined, severity: bugSeverity },
      {
        onSuccess: () => {
          toast.success("Bug created");
          setBugSheetOpen(false);
          setBugResultId(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [bugResultId, bugTitle, bugSeverity, createBugFromResult, projectId, runId]);

  const handleBugTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBugTitle(e.target.value);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <PageWrapper title="Loading…" backHref={`/projects/${projectId}/qa`}>
        <PmPageShell>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className={cn("h-20 rounded-xl", PM_PANEL)} />
            ))}
          </div>
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (isError || !run) {
    return (
      <PageWrapper title="Run" backHref={`/projects/${projectId}/qa`}>
        <PmPageShell withGlow={false}>
          <ErrorState onRetry={handleRetry} />
        </PmPageShell>
      </PageWrapper>
    );
  }

  const results = run.results ?? [];

  return (
    <PageWrapper
      title={run.name}
      backHref={`/projects/${projectId}/qa`}
      actions={
        canManage && run.status !== "completed" ? (
          <CompleteRunButton onClick={handleCompleteRun} isPending={updateRun.isPending} />
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <PmPanel className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[run.status])}>
              {STATUS_LABELS[run.status]}
            </Badge>
            {run.environment ? (
              <span className={cn(TEXT_ONE_LINE, "max-w-[12rem] text-[11px] text-muted-foreground")}>
                {run.environment}
              </span>
            ) : null}
            <ProgressBar counts={run.counts} />
          </PmPanel>
        </PmSection>

        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          {results.length === 0 ? (
            <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="ticket"
                title="No test results"
                description="No test cases were added to this run."
              />
          ) : (
            <PmStaggerList className="space-y-2">
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
            </PmStaggerList>
          )}
        </PmSection>
      </PmPageShell>

      <Sheet open={bugSheetOpen} onOpenChange={setBugSheetOpen}>
        <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 border-b px-5 py-4">
            <SheetTitle>Create Bug from Result</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="space-y-4 px-5 py-4">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Title *</Label>
                <Input
                  value={bugTitle}
                  onChange={handleBugTitleChange}
                  className="text-[11px]"
                  placeholder="Bug title"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Severity</Label>
                <Select value={bugSeverity} onValueChange={setBugSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
          <SheetFooter className="flex shrink-0 gap-2 border-t px-5 py-3">
            <SheetClose asChild>
              <Button variant="outline" size="sm" className="text-[11px]">Cancel</Button>
            </SheetClose>
            <LoadingButton
              size="sm"
              className="text-[11px]"
              onClick={handleSubmitBug}
              disabled={!bugTitle.trim()}
              isPending={createBugFromResult.isPending}
              loadingText="Creating…"
            >
              Create Bug
            </LoadingButton>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
