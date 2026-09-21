"use client";

import { useCallback, useState } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTestRunDetail, useUpdateTestRun, useCreateBugFromResult } from "@/hooks/api/build/qa";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
} from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { ResultRow } from "./result-row";
import type { TestRunStatus, TestRunCounts } from "@/types/projects";

const createBugFromResultSchema = z.object({
  bugTitle: z.string().min(1, "Title is required"),
  bugSeverity: z.string(),
});

type CreateBugFromResultFormValues = z.infer<typeof createBugFromResultSchema>;

const STATUS_STYLES: Record<string, string> = {
  not_started: "text-muted-foreground border-border",
  in_progress: "text-status-info-ink border-status-info-rule",
  completed: "text-status-success-ink border-status-success-rule",
  aborted: "text-status-danger-ink border-status-danger-rule",
};

const STATUS_LABELS: Record<string, string> = {
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
          className="h-full rounded-full bg-status-success-fill transition-[width] duration-300"
          style={{ width: `${passPct}%` }}
        />
      </div>
      <span className="text-dense tabular-nums text-muted-foreground">
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
      className="gap-1 text-dense"
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
  const canManage = useCan("build:qa:manage");
  const canExecute = useCan("build:qa:execute");
  const canCreateBug = useCan("build:bugs:create");

  const { data: run, isLoading, isError, error, refetch } = useTestRunDetail(projectId, runId);
  const updateRun = useUpdateTestRun();
  const createBugFromResult = useCreateBugFromResult();

  const [bugSheetOpen, setBugSheetOpen] = useState(false);
  const [bugResultId, setBugResultId] = useState<number | null>(null);

  const bugForm = useForm<CreateBugFromResultFormValues>({
    resolver: zodResolver(createBugFromResultSchema),
    defaultValues: { bugTitle: "", bugSeverity: "major" },
  });
  useRegisterDirtyState(bugSheetOpen && bugForm.formState.isDirty);

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
    bugForm.reset({
      bugTitle: tc ? `Bug in TC-${tc.caseNumber}: ${tc.title}` : "",
      bugSeverity: "major",
    });
    setBugResultId(resultId);
    setBugSheetOpen(true);
  }, [run, bugForm]);

  const handleSubmitBug = useCallback((values: CreateBugFromResultFormValues) => {
    if (!bugResultId) return;
    createBugFromResult.mutate(
      { projectId, runId, resultId: bugResultId, title: values.bugTitle || undefined, severity: values.bugSeverity },
      {
        onSuccess: () => {
          toast.success("Bug created");
          setBugSheetOpen(false);
          setBugResultId(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [bugResultId, createBugFromResult, projectId, runId]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const pageState = usePageState({ permission: "build:qa:view", isLoading, isError, error });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageWrapper title="Run" backHref={`/build/${projectId}/qa`}>
        <PmPageShell>
          <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
            {null}
          </PageState>
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (pageState.kind === "loading") {
    return (
      <PageWrapper title="Loading…" backHref={`/build/${projectId}/qa`}>
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

  if (!run) {
    return (
      <PageWrapper title="Run" backHref={`/build/${projectId}/qa`}>
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
      backHref={`/build/${projectId}/qa`}
      actions={
        canManage && run.status !== "completed" ? (
          <CompleteRunButton onClick={handleCompleteRun} isPending={updateRun.isPending} />
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <PmPanel className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <Badge variant="outline" className={cn("text-micro", STATUS_STYLES[run.status])}>
              {STATUS_LABELS[run.status]}
            </Badge>
            {run.environment ? (
              <span className={cn(TEXT_ONE_LINE, "max-w-[12rem] text-dense text-muted-foreground")}>
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
          <Form {...bugForm}>
            <form onSubmit={bugForm.handleSubmit(handleSubmitBug)} className="flex min-h-0 flex-1 flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-4 px-5 py-4">
                  <FormField
                    control={bugForm.control}
                    name="bugTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">Title <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} className="text-dense" placeholder="Bug title" />
                        </FormControl>
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bugForm.control}
                    name="bugSeverity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">Severity</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="blocker">Blocker</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="major">Major</SelectItem>
                            <SelectItem value="minor">Minor</SelectItem>
                            <SelectItem value="trivial">Trivial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                </div>
              </ScrollArea>
              <SheetFooter className="flex shrink-0 gap-2 border-t px-5 py-3">
                <SheetClose asChild>
                  <Button type="button" variant="outline" size="sm" className="text-dense">Cancel</Button>
                </SheetClose>
                <LoadingButton
                  type="submit"
                  size="sm"
                  className="text-dense"
                  isPending={createBugFromResult.isPending}
                  loadingText="Creating…"
                >
                  Create Bug
                </LoadingButton>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
