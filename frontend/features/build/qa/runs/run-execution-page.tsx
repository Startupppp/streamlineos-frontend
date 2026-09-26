"use client";

import { useCallback, useMemo, useState } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBugFromResultSchema, type CreateBugFromResultFormValues } from "./run-schema";
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
import { DataTable } from "@/components/ui/data-table";
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
import { Textarea } from "@/components/ui/textarea";
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
  PM_FILL_PANEL,
  PM_PANEL,
} from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { buildResultColumns, RESULT_TABLE_HEADERS } from "./result-columns";
import { ResultRow } from "./result-row";
import { RunResultBulkActionBar } from "./run-result-bulk-action-bar";
import { useUpdateTestResult } from "@/hooks/api/build/qa";
import type { TestRunStatus, TestRunCounts, TestRunResult } from "@/types/projects";

const STATUS_STYLES: Record<string, string> = {
  not_started: "text-muted-foreground border-border",
  in_progress: "text-status-info-ink-strong border-status-info-rule",
  completed: "text-status-success-ink-strong border-status-success-rule",
  aborted: "text-status-danger-ink-strong border-status-danger-rule",
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  aborted: "Aborted",
};

const RESULT_STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "not_run", label: "Not Run" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "blocked", label: "Blocked" },
  { value: "skipped", label: "Skipped" },
];

const RESULT_FILTER_DEFINITIONS = [
  { param: "status", options: ["not_run", "passed", "failed", "blocked", "skipped"] as const },
] as const;

function ProgressBar({ counts }: { counts: TestRunCounts }) {
  if (counts.total === 0) return null;
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
  const updateResult = useUpdateTestResult();

  const listFilters = useBuildListFilters({ filters: RESULT_FILTER_DEFINITIONS });
  const [selectedIds, setSelectedIds] = useState(new Set<string | number>());

  const [bugSheetOpen, setBugSheetOpen] = useState(false);
  const [bugResultId, setBugResultId] = useState<number | null>(null);

  const [notesSheetOpen, setNotesSheetOpen] = useState(false);
  const [notesResult, setNotesResult] = useState<TestRunResult | null>(null);
  const [notesValue, setNotesValue] = useState("");

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

  const handleOpenNotes = useCallback((result: TestRunResult) => {
    setNotesResult(result);
    setNotesValue(result.notes ?? "");
    setNotesSheetOpen(true);
  }, []);

  const handleSaveNotes = useCallback(() => {
    if (!notesResult) return;
    updateResult.mutate(
      {
        projectId,
        runId,
        resultId: notesResult.id,
        status: notesResult.status,
        notes: notesValue || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Notes saved");
          setNotesSheetOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [notesResult, notesValue, projectId, runId, updateResult]);

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

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const filteredResults = useMemo(() => {
    const allResults = run?.results ?? [];
    const statusFilter = listFilters.value("status");
    const q = listFilters.debouncedSearch.toLowerCase();
    return allResults.filter((r) => {
      if (statusFilter !== BUILD_FILTER_ALL && r.status !== statusFilter) return false;
      if (q && !r.testCase?.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [run?.results, listFilters]);

  const columns = useMemo(
    () =>
      buildResultColumns({
        projectId,
        canExecute,
        canCreateBug,
        onCreateBug: handleOpenCreateBug,
        onOpenNotes: handleOpenNotes,
      }),
    [projectId, canExecute, canCreateBug, handleOpenCreateBug, handleOpenNotes],
  );

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
        <PmPageShell>
          <ErrorState onRetry={handleRetry} />
        </PmPageShell>
      </PageWrapper>
    );
  }

  const results = run.results ?? [];
  const runCounts: TestRunCounts = {
    total: results.length,
    passed: results.filter((result) => result.status === "passed").length,
    failed: results.filter((result) => result.status === "failed").length,
    blocked: results.filter((result) => result.status === "blocked").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    notRun: results.filter((result) => result.status === "not_run").length,
  };

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
            <ProgressBar counts={runCounts} />
          </PmPanel>
        </PmSection>

        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          <BuildListToolbar
            search={listFilters.search}
            onSearchChange={listFilters.setSearch}
            searchPlaceholder="Search test cases…"
          >
            <BuildFilterSelect
              filterId="status"
              label="Status"
              value={listFilters.value("status")}
              options={RESULT_STATUS_OPTIONS}
              isActive={listFilters.isActive("status")}
              onChange={(v) => listFilters.setValue("status", v)}
            />
          </BuildListToolbar>

          {selectedIds.size > 0 ? (
            <RunResultBulkActionBar
              projectId={projectId}
              runId={runId}
              selectedIds={selectedIds}
              onClear={handleClearSelection}
            />
          ) : null}

          {filteredResults.length === 0 ? (
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="ticket"
              title={listFilters.isFiltered ? "No results match the current filters" : "No test results"}
              description={listFilters.isFiltered ? "Try clearing the filters." : "No test cases were added to this run."}
            />
          ) : (
            <DataTable
              data={filteredResults}
              columns={columns}
              getRowKey={(row) => row.id}
              selection={{
                selected: selectedIds,
                onChange: setSelectedIds,
                getRowLabel: (row) => row.testCase?.title ?? `Result ${row.id}`,
              }}
              mobileCard={(result) => (
                <ResultRow
                  result={result}
                  projectId={projectId}
                  canExecute={canExecute}
                  canCreateBug={canCreateBug}
                  onCreateBug={handleOpenCreateBug}
                />
              )}
            />
          )}
        </PmSection>
      </PmPageShell>

      <Sheet open={notesSheetOpen} onOpenChange={setNotesSheetOpen}>
        <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 border-b px-5 py-4">
            <SheetTitle>
              {notesResult?.testCase
                ? `Notes for TC-${notesResult.testCase.caseNumber}`
                : "Execution Notes"}
            </SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col p-5">
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Add execution notes…"
              className="min-h-[120px] resize-none text-dense"
              disabled={!canExecute}
            />
          </div>
          <SheetFooter className="flex shrink-0 gap-2 border-t px-5 py-3">
            <SheetClose asChild>
              <Button type="button" variant="outline" size="sm" className="text-dense">
                Cancel
              </Button>
            </SheetClose>
            {canExecute ? (
              <LoadingButton
                type="button"
                size="sm"
                className="text-dense"
                isPending={updateResult.isPending}
                loadingText="Saving…"
                onClick={handleSaveNotes}
              >
                Save
              </LoadingButton>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
