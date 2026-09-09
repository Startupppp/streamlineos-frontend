"use client";

import { useCallback, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { RequireModule } from "@/components/auth/require-module";
import { useCanState } from "@/hooks/api/access";
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

/**
 * The shortlist starts at five and widens once.
 *
 * Five is what somebody will actually listen to; twenty is the ceiling because
 * past that a ranked recommendation is just the window in a different order.
 */
const EXEMPLAR_PAGE_SIZE = 5;
const EXEMPLAR_WIDE_SIZE = 20;

/**
 * CRM-P2-05 and CRM-P2-06 on one screen: how a person's calls are going, and
 * which call to listen to next.
 *
 * Gated on `crm:call-analysis:view` — the key every CRM member holds — and not
 * on `crm:call-analysis:view-team`, which is what `/crm/intelligence` beside it
 * uses. That is the difference between the two pages rather than an
 * inconsistency: the digest is the whole team seen at once and is a manager's
 * surface; this one is "my numbers", and it happens to widen into "my team's
 * numbers" for somebody who holds the team key. The server decides which of
 * those a caller gets, per call, and says so in `meta.scope`; the page reads
 * that rather than inferring it from the row count, so a manager with one
 * direct report is not mislabelled as looking at their own calls.
 *
 * `backHref` points at the digest only for somebody who can open it. A back
 * button that lands on a permission wall is worse than no back button, and the
 * digest is genuinely where a manager came from.
 *
 * Both reads share the window, and the exemplar list additionally takes a
 * metric. They are two queries rather than one because they page independently
 * and because a metric change must not refetch the table — the two numbers on
 * screen would flicker for a filter that does not affect them.
 */
export default function RepCallMetricsPage() {
  const [sinceDays, setSinceDays] = useState(30);
  const [metric, setMetric] = useState<ExemplarMetric>("talk-ratio");
  const [page, setPage] = useState(1);
  const [exemplarLimit, setExemplarLimit] = useState(EXEMPLAR_PAGE_SIZE);

  const canReadTeam = useCanState("crm:call-analysis:view-team") === "granted";

  const handleWindowChange = useCallback((value: string) => {
    setSinceDays(Number(value));
    setExemplarLimit(EXEMPLAR_PAGE_SIZE);
    // Every filter change resets pagination, or page three of a 90-day window
    // becomes an empty page two of a 7-day one.
    setPage(1);
  }, []);

  const handleMetricChange = useCallback((value: string) => {
    setMetric(value as ExemplarMetric);
    // A new metric is a new ranking, so the shortlist starts short again.
    setExemplarLimit(EXEMPLAR_PAGE_SIZE);
  }, []);

  const handleShowMoreExemplars = useCallback(() => setExemplarLimit(EXEMPLAR_WIDE_SIZE), []);

  const metrics = useCallRepMetrics({ sinceDays, page, limit: PAGE_SIZE });
  const exemplars = useCallExemplars({ metric, sinceDays, page: 1, limit: exemplarLimit });

  /**
   * Ticket 26. A gated-shut query reports no rows with `isLoading: false`, which
   * is indistinguishable from a window in which nobody made a call. Somebody who
   * cannot read call analyses at all should be told that, not shown an empty
   * table and left to conclude the feature is broken.
   */
  if (useCanState("crm:call-analysis:view") === "denied")
    return (
      <NoPermissionState
        permission="crm:call-analysis:view"
        description="Call metrics are built from call analyses, which this role cannot read."
      />
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
                /**
                 * True only while a different page or window is in flight and
                 * the rows on screen belong to the previous one. An ordinary
                 * background refetch keeps its rows — replacing a table the
                 * reader is looking at with a skeleton is the "loader on every
                 * refetch" anti-pattern.
                 */
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

/**
 * A visual Xerox of the loaded page: four stat tiles, a table and the exemplar
 * panel. A spinner here would say "something is happening"; this says what.
 */
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
