"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCanState } from "@/hooks/api/access";
import { useReportingSources, useReportRun } from "@/hooks/api/crm/reporting";
import { cn } from "@/lib/utils";
import type { ReportingQueryDescription } from "@/types/crm/reporting";
import {
  DEFAULT_REPORT_BUILDER_VALUES,
  reportBuilderSchema,
  type ReportBuilderValues,
} from "./report-builder-schema";
import { buildQueryDescription } from "./report-query-description";
import { ReportBuilderForm } from "./report-builder-form";
import { ReportResultsPanel } from "./report-results-panel";
import { sourceFieldOptions } from "./report-source-fields";

const REPORTING_RUN_KEY = "crm:reporting:run";

/**
 * The one human consumer of `crm/reporting`.
 *
 * Two things are deliberately split. The **form** holds what is being asked and
 * changes as somebody types; the **submitted** description is what has actually
 * been sent, and only "Run report" moves one into the other — so an in-progress
 * edit never fires a query, and the results on screen always answer a question
 * somebody finished asking.
 *
 * The offset lives outside both. Paging is not a new question, so it re-runs the
 * submitted description at a new offset rather than rebuilding from a form the
 * reader may have edited since.
 */
export function ReportBuilderPage() {
  const access = useCanState(REPORTING_RUN_KEY);
  const sourcesQuery = useReportingSources();
  const [submitted, setSubmitted] = useState<ReportBuilderValues | null>(null);
  const [offset, setOffset] = useState(0);

  const form = useForm<ReportBuilderValues>({
    resolver: zodResolver(reportBuilderSchema),
    defaultValues: DEFAULT_REPORT_BUILDER_VALUES,
  });

  const description: ReportingQueryDescription | null = useMemo(
    () => (submitted ? buildQueryDescription({ ...submitted, offset }) : null),
    [submitted, offset],
  );

  const runQuery = useReportRun(description);
  const sources = sourcesQuery.data ?? [];
  const submittedSource = sources.find((entry) => entry.key === submitted?.source);
  const resultOptions = sourceFieldOptions(submittedSource);

  function handleSubmit(values: ReportBuilderValues) {
    setOffset(0);
    setSubmitted(values);
  }

  function handleSourceChange(sourceKey: string) {
    form.reset({ ...DEFAULT_REPORT_BUILDER_VALUES, source: sourceKey });
  }

  function handleRetry() {
    void runQuery.refetch();
  }

  function handleSourcesRetry() {
    void sourcesQuery.refetch();
  }

  return (
    <PageWrapper
      title="Report builder"
      subtitle="Ask the CRM a question and read the answer."
      backHref="/crm/reports"
      backLabel="Back to reports"
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
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          <div className={cn(CONTENT_PANEL_SOLID, "flex min-h-0 flex-col p-4 lg:w-96 lg:shrink-0")}>
            {access === "loading" || sourcesQuery.isLoading ? (
              <ReportBuilderFormSkeleton />
            ) : (
              <ReportBuilderForm
                form={form}
                sources={sources}
                isRunning={runQuery.isFetching}
                onSubmit={handleSubmit}
                onSourceChange={handleSourceChange}
              />
            )}
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <ReportResultsPanel
              access={runQuery.access}
              result={runQuery.data}
              options={resultOptions}
              hasRun={description !== null}
              isLoading={runQuery.isLoading}
              isError={runQuery.isError}
              error={runQuery.error}
              limit={submitted?.limit ?? DEFAULT_REPORT_BUILDER_VALUES.limit}
              offset={offset}
              onOffsetChange={setOffset}
              onRetry={handleRetry}
            />
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

function ReportBuilderFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  );
}
