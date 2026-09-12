"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan, useCanState } from "@/hooks/api/access";
import {
  useReportDefinition,
  useReportDefinitionRun,
  useReportingSources,
  useReportRun,
} from "@/hooks/api/crm/reporting";
import { cn } from "@/lib/utils";
import type { ReportDefinition, ReportingQueryDescription } from "@/types/crm/reporting";
import {
  DEFAULT_REPORT_BUILDER_VALUES,
  type ReportBuilderValues,
} from "./report-builder-schema";
import { buildQueryDescription } from "./report-query-description";
import { toBuilderValues } from "./report-builder-values";
import { planReportRun, type ReportRunRequest } from "./report-run-mode";
import { ReportBuilderActions } from "./report-builder-actions";
import { ReportBuilderPanel } from "./report-builder-panel";
import {
  ReportBuilderFormSkeleton,
  UnshowableReport,
} from "./report-builder-states";
import { ReportResultsPanel } from "./report-results-panel";
import { ReportExplainDialog } from "./report-explain-dialog";
import { SaveReportDialog } from "./save-report-dialog";
import { SavedReportsSheet } from "./saved-reports-sheet";
import { ScheduleReportSheet } from "./schedule-report-sheet";
import type { SaveReportValues } from "./save-report-schema";
import { sourceFieldOptions } from "./report-source-fields";
import { useSaveReport } from "./use-save-report";

const REPORTING_RUN_KEY = "crm:reporting:run";
const REPORTING_MANAGE_KEY = "crm:reporting:manage";
const REPORTING_VIEW_KEY = "crm:reporting:view";
const REPORT_PARAM = "report";

/**
 * The one human consumer of `crm/reporting`.
 *
 * Two things are deliberately split. The **form** holds what is being asked and
 * changes as somebody types; the **request** is what has actually been sent, and
 * only "Run report" moves one into the other — so an in-progress edit never
 * fires a query, and the results on screen always answer a question somebody
 * finished asking.
 *
 * The offset lives outside both. Paging is not a new question, so it re-runs the
 * submitted request at a new offset rather than rebuilding from a form the
 * reader may have edited since.
 *
 * Which report is open lives in the URL rather than in state, so a saved report
 * is a link somebody can send, and a reload comes back showing the stored
 * question instead of an empty builder.
 */
export function ReportBuilderPage() {
  const access = useCanState(REPORTING_RUN_KEY);
  const canManage = useCan(REPORTING_MANAGE_KEY);
  const canViewSaved = useCan(REPORTING_VIEW_KEY);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const definitionId = searchParams.get(REPORT_PARAM);

  const sourcesQuery = useReportingSources();
  const definitionQuery = useReportDefinition(definitionId);
  const definition = definitionQuery.data;
  const sources = useMemo(() => sourcesQuery.data ?? [], [sourcesQuery.data]);

  const [request, setRequest] = useState<ReportRunRequest | null>(null);
  const [offset, setOffset] = useState(0);
  const [savedReportsOpen, setSavedReportsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [explainOf, setExplainOf] = useState<ReportingQueryDescription | null>(null);
  const [pendingSave, setPendingSave] = useState<ReportBuilderValues | null>(null);

  const setDefinitionId = useCallback(
    (nextId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextId === null) params.delete(REPORT_PARAM);
      else params.set(REPORT_PARAM, nextId);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleSaved = useCallback(
    (saved: ReportDefinition) => {
      setPendingSave(null);
      if (saved.reportDefinitionId !== definitionId) setDefinitionId(saved.reportDefinitionId);
    },
    [definitionId, setDefinitionId],
  );

  const { save, isSaving } = useSaveReport({
    reportDefinitionId: definitionId,
    onSaved: handleSaved,
  });

  /** The stored description, read back into the form that could have produced it. */
  const loaded = useMemo(() => {
    if (!definition) return null;
    const source = sources.find((entry) => entry.key === definition.queryDescription.source);
    return toBuilderValues(definition.queryDescription, sourceFieldOptions(source));
  }, [definition, sources]);

  const savedValues = loaded?.kind === "loaded" ? loaded.values : null;

  const plan = planReportRun({
    request,
    reportDefinitionId: definitionId,
    savedValues,
    savedLimit: definition?.queryDescription.limit ?? null,
    offset,
  });

  const adHocRun = useReportRun(plan.kind === "ad-hoc" ? plan.description : null);
  const savedRun = useReportDefinitionRun(
    plan.kind === "saved" ? plan.reportDefinitionId : null,
    plan.kind === "saved" ? plan.overrides : null,
  );
  const run = plan.kind === "saved" ? savedRun : adHocRun;

  /** Which source the results describe — the one that was run, not the one on screen. */
  const ranSource =
    request?.kind === "form"
      ? request.values.source
      : (definition?.queryDescription.source ?? null);
  const resultOptions = sourceFieldOptions(sources.find((entry) => entry.key === ranSource));
  const ranLimit =
    request?.kind === "form"
      ? request.values.limit
      : (definition?.queryDescription.limit ?? DEFAULT_REPORT_BUILDER_VALUES.limit);

  function handleRun(values: ReportBuilderValues) {
    setOffset(0);
    setRequest({ kind: "form", values });
  }

  function handleRunAsSaved() {
    setOffset(0);
    setRequest({ kind: "saved-as-is" });
  }

  function handleExplain(values: ReportBuilderValues) {
    setExplainOf(buildQueryDescription({ ...values, offset: 0 }));
  }

  function handleOpenReport(nextId: string) {
    setRequest(null);
    setOffset(0);
    setSavedReportsOpen(false);
    setDefinitionId(nextId);
  }

  function handleNewReport() {
    setRequest(null);
    setOffset(0);
    setDefinitionId(null);
  }

  function handleOpenSavedReports() {
    setSavedReportsOpen(true);
  }

  function handleOpenSchedule() {
    setScheduleOpen(true);
  }

  function handleSaveSubmit(values: SaveReportValues) {
    if (pendingSave) save(pendingSave, values);
  }

  function handleSaveDialogOpenChange(next: boolean) {
    if (!next) setPendingSave(null);
  }

  function handleExplainDialogOpenChange(next: boolean) {
    if (!next) setExplainOf(null);
  }

  function handleRetry() {
    void run.refetch();
  }

  function handleSourcesRetry() {
    void sourcesQuery.refetch();
  }

  const isOpening = definitionId !== null && definitionQuery.isLoading;

  return (
    <PageWrapper
      title={definition ? definition.name : "Report builder"}
      subtitle={definition?.description ?? "Ask the CRM a question and read the answer."}
      backHref="/crm/reports"
      backLabel="Back to reports"
      actions={
        <ReportBuilderActions
          reportDefinitionId={definitionId}
          canViewSaved={canViewSaved}
          onNewReport={handleNewReport}
          onOpenSchedule={handleOpenSchedule}
          onOpenSavedReports={handleOpenSavedReports}
        />
      }
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      {access === "denied" ? (
        <NoPermissionState permission={REPORTING_RUN_KEY} className="flex-1" />
      ) : sourcesQuery.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load what you can report on"
          description={getErrorMessage(sourcesQuery.error)}
          onRetry={handleSourcesRetry}
        />
      ) : definitionQuery.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't open that report"
          description={getErrorMessage(definitionQuery.error)}
          onRetry={handleNewReport}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          <div className={cn(CONTENT_PANEL_SOLID, "flex min-h-0 flex-col p-4 lg:w-96 lg:shrink-0")}>
            {access === "loading" || sourcesQuery.isLoading || isOpening ? (
              <ReportBuilderFormSkeleton />
            ) : loaded?.kind === "unrepresentable" ? (
              <UnshowableReport
                reason={loaded.reason}
                isRunning={run.isFetching}
                onRun={handleRunAsSaved}
              />
            ) : (
              <>
                {loaded?.kind === "loaded" && loaded.unknownFields.length > 0 ? (
                  <p role="status" className="mb-3 text-label text-status-warning-ink">
                    This report reads {loaded.unknownFields.join(", ")}, which is not among the
                    sources you can query. Those rows are blank until you replace them.
                  </p>
                ) : null}
                <ReportBuilderPanel
                  key={definitionId ?? "new"}
                  initialValues={savedValues ?? DEFAULT_REPORT_BUILDER_VALUES}
                  sources={sources}
                  isRunning={run.isFetching}
                  canSave={canManage}
                  canExplain={canManage}
                  onRun={handleRun}
                  onSave={setPendingSave}
                  onExplain={handleExplain}
                />
              </>
            )}
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <ReportResultsPanel
              access={run.access}
              result={run.data}
              options={resultOptions}
              hasRun={plan.kind !== "idle"}
              isLoading={run.isLoading}
              isError={run.isError}
              error={run.error}
              limit={ranLimit}
              offset={offset}
              onOffsetChange={setOffset}
              onRetry={handleRetry}
            />
          </div>
        </div>
      )}

      <SavedReportsSheet
        open={savedReportsOpen}
        onOpenChange={setSavedReportsOpen}
        onOpenReport={handleOpenReport}
        currentReportDefinitionId={definitionId}
      />

      <SaveReportDialog
        open={pendingSave !== null}
        onOpenChange={handleSaveDialogOpenChange}
        defaultValues={{
          name: definition?.name ?? "",
          description: definition?.description ?? "",
        }}
        isExisting={definitionId !== null}
        isSubmitting={isSaving}
        onSubmit={handleSaveSubmit}
      />

      {definitionId !== null ? (
        <ScheduleReportSheet
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          reportDefinitionId={definitionId}
          reportName={definition?.name ?? "This report"}
        />
      ) : null}

      <ReportExplainDialog
        open={explainOf !== null}
        onOpenChange={handleExplainDialogOpenChange}
        description={explainOf}
      />
    </PageWrapper>
  );
}
