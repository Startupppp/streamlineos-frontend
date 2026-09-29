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
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { CircleCheckIcon } from "@animateicons/react/lucide";
import { NotesSheet, CreateBugSheet } from "./run-execution-sheets";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  CONTENT_FILL_PANEL,
  PM_PANEL,
} from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { buildResultColumns } from "./result-columns";
import { ResultRow } from "./result-row";
import { RunResultBulkActionBar } from "./run-result-bulk-action-bar";
import { useUpdateTestResult } from "@/hooks/api/build/qa";
import type { TestRunCounts, TestRunResult } from "@/types/projects";

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

  const handleRenderResultMobileCard = useCallback(
    (result: TestRunResult) => (
      <ResultRow
        result={result}
        projectId={projectId}
        canExecute={canExecute}
        canCreateBug={canCreateBug}
        onCreateBug={handleOpenCreateBug}
      />
    ),
    [projectId, canExecute, canCreateBug, handleOpenCreateBug],
  );

  const pageState = usePageState({
    permission: "build:qa:view",
    isLoading,
    isError,
    error,
    isEmpty: run === null,
  });

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

  if (pageState.kind === "empty") {
    return (
      <PageWrapper title="Run not found" backHref={`/build/${projectId}/qa`}>
        <PmPageShell>
          <EmptyState
            className="flex-1"
            illustrationPreset="ticket"
            title="Test run not found"
            description="This test run no longer exists, or you no longer have access to it."
            action={{ label: "Back to QA", href: `/build/${projectId}/qa` }}
          />
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

  const effectiveStatus: string =
    run.status === "completed" || run.status === "aborted"
      ? run.status
      : runCounts.total > 0 && runCounts.notRun === 0
        ? "completed"
        : runCounts.total > runCounts.notRun
          ? "in_progress"
          : run.status;

  return (
    <PageWrapper
      title={run.name}
      backHref={`/build/${projectId}/qa`}
      actions={
        canManage && effectiveStatus !== "completed" ? (
          <CompleteRunButton onClick={handleCompleteRun} isPending={updateRun.isPending} />
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <PmPanel className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <Badge variant="outline" className={cn("text-micro", STATUS_STYLES[effectiveStatus])}>
              {STATUS_LABELS[effectiveStatus]}
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
            search={{
              value: listFilters.search,
              onValueChange: listFilters.setSearch,
              placeholder: "Search test cases…",
            }}
            filters={[
              {
                id: "status",
                label: "Status",
                active: listFilters.isActive("status"),
                control: (
                  <BuildFilterSelect
                    label="Status"
                    value={listFilters.value("status")}
                    options={RESULT_STATUS_OPTIONS}
                    onValueChange={(v) => listFilters.setValue("status", v)}
                  />
                ),
              },
            ]}
          />

          {selectedIds.size > 0 ? (
            <RunResultBulkActionBar
              projectId={projectId}
              runId={runId}
              selectedIds={selectedIds}
              onClear={handleClearSelection}
            />
          ) : null}

          <BuildListSurface<TestRunResult>
            permission="build:qa:view"
            rows={filteredResults}
            columns={columns}
            isLoading={false}
            isError={false}
            isFiltered={listFilters.isFiltered}
            getRowKey={(row) => row.id}
            mobileCard={handleRenderResultMobileCard}
            selection={{
              selected: selectedIds,
              onChange: setSelectedIds,
              getRowLabel: (row) => row.testCase?.title ?? `Result ${row.id}`,
            }}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="ticket"
                title="No test results"
                description="No test cases were added to this run."
              />
            }
            filteredEmpty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="ticket"
                title="No results match the current filters"
                description="Try clearing the filters."
              />
            }
          />
        </PmSection>
      </PmPageShell>

      <NotesSheet
        open={notesSheetOpen}
        onOpenChange={setNotesSheetOpen}
        notesResult={notesResult}
        notesValue={notesValue}
        onNotesChange={setNotesValue}
        canExecute={canExecute}
        isSaving={updateResult.isPending}
        onSave={handleSaveNotes}
      />

      <CreateBugSheet
        open={bugSheetOpen}
        onOpenChange={setBugSheetOpen}
        form={bugForm}
        onSubmit={handleSubmitBug}
        isPending={createBugFromResult.isPending}
      />
    </PageWrapper>
  );
}
