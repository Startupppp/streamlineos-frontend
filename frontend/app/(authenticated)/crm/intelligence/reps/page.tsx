"use client";

import { useCallback, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { ErrorState } from "@/components/shared";
import { RequireModule } from "@/components/auth/require-module";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useCallExemplars, useCallRepMetrics } from "@/hooks/api/crm/call-intelligence";
import { getErrorMessage } from "@/lib/get-error-message";
import { EXEMPLAR_METRICS, type ExemplarMetric } from "@/types/crm/call-intelligence";
import {
  BestCallExemplars,
  EXEMPLAR_METRIC_LABEL,
} from "@/features/crm/intelligence/best-call-exemplars";
import { RepMetricsTable } from "@/features/crm/intelligence/rep-metrics-table";

const WINDOWS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

const PAGE_SIZE = 25;

const EXEMPLAR_PAGE_SIZE = 5;
const EXEMPLAR_WIDE_SIZE = 20;

export default function RepCallMetricsPage() {
  const [sinceDays, setSinceDays] = useState(30);
  const [metric, setMetric] = useState<ExemplarMetric>("talk-ratio");
  const [page, setPage] = useState(1);
  const [exemplarLimit, setExemplarLimit] = useState(EXEMPLAR_PAGE_SIZE);

  const canReadTeam = useCan("crm:call-analysis:view-team");

  const handleWindowChange = useCallback((value: string) => {
    setSinceDays(Number(value));
    setExemplarLimit(EXEMPLAR_PAGE_SIZE);
    setPage(1);
  }, []);

  const handleMetricChange = useCallback((value: string) => {
    const next = EXEMPLAR_METRICS.find((candidate) => candidate === value);
    if (!next) return;
    setMetric(next);
    setExemplarLimit(EXEMPLAR_PAGE_SIZE);
  }, []);

  const handleShowMoreExemplars = useCallback(() => setExemplarLimit(EXEMPLAR_WIDE_SIZE), []);

  const metrics = useCallRepMetrics({ sinceDays, page, limit: PAGE_SIZE });
  const exemplars = useCallExemplars({ metric, sinceDays, page: 1, limit: exemplarLimit });

  const pageState = usePageState({
    permission: "crm:call-analysis:view",
    isLoading: metrics.isLoading,
    isError: metrics.isError,
    error: metrics.error,
  });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Call metrics">
        <PageState resolution={pageState} loading={null} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <RequireModule module="crm">
      <PageWrapper
        title="Call metrics"
        subtitle={
          metrics.data?.meta.scope === "team"
            ? "How your team's calls are going, per person"
            : "How your calls are going"
        }
        backHref={canReadTeam ? "/crm/intelligence" : undefined}
        backLabel="Back to call intelligence"
        filters={
          <div className={FILTER_TOOLBAR_ROW}>
            <Tabs value={String(sinceDays)} onValueChange={handleWindowChange}>
              <TabsList>
                {WINDOWS.map((window) => (
                  <TabsTrigger key={window.value} value={window.value}>
                    {window.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Select value={metric} onValueChange={handleMetricChange}>
              <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Exemplar metric">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                {EXEMPLAR_METRICS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {EXEMPLAR_METRIC_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          {metrics.error ? (
            <ErrorState
              className="flex-1"
              title="Couldn't load call metrics"
              description={getErrorMessage(metrics.error)}
              onRetry={() => void metrics.refetch()}
            />
          ) : metrics.isLoading && !metrics.data ? (
            <RepMetricsSkeleton />
          ) : metrics.data ? (
            <>
              <StatCardGrid cols={4}>
                <StatCard
                  label="Calls analysed"
                  value={metrics.data.data.reduce((total, row) => total + row.callsAnalysed, 0)}
                  featured
                  hint={`Last ${metrics.data.meta.sinceDays} days`}
                />
                <StatCard
                  label="Still private"
                  value={metrics.data.meta.embargoed}
                  hint={`Rep's first ${metrics.data.meta.privateWindowHours}h`}
                />
                <StatCard
                  label="Awaiting consent"
                  value={metrics.data.meta.consentBlocked}
                  hint="No recording-consent record"
                />
                <StatCard
                  label="Unattributed"
                  value={metrics.data.meta.unattributed}
                  hint="No rep on the call"
                />
              </StatCardGrid>

              <RepMetricsTable
                response={metrics.data}
                isLoading={metrics.isFetching && metrics.isPlaceholderData}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />

              {exemplars.error ? (
                <ErrorState
                  title="Couldn't load the best calls"
                  description={getErrorMessage(exemplars.error)}
                  onRetry={() => void exemplars.refetch()}
                />
              ) : exemplars.data ? (
                <BestCallExemplars
                  response={exemplars.data}
                  onShowMore={
                    exemplarLimit === EXEMPLAR_PAGE_SIZE ? handleShowMoreExemplars : undefined
                  }
                />
              ) : (
                <Skeleton className="h-48 w-full" />
              )}
            </>
          ) : null}
        </div>
      </PageWrapper>
    </RequireModule>
  );
}

function RepMetricsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <Skeleton key={tile} className="h-14 w-full" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
