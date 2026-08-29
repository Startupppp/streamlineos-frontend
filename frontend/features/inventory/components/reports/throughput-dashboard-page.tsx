"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Info, PackageCheck, ListChecks, Truck } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyChartIllustration } from "@/components/illustrations";
import { ErrorState, NoPermissionState } from "@/components/shared";
import {
  FILTER_TOOLBAR_ROW,
  CONTENT_PANEL_SOLID,
} from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { typeScaleClass } from "@/lib/design-tokens";
import { formatDateOnly, formatShortDate } from "@/lib/date-utils";
import { useCan } from "@/hooks/api/access";
import {
  THROUGHPUT_READ_KEY,
  useThroughputMetrics,
  type ThroughputMetrics,
} from "@/hooks/api/inventory/operations-metrics";
import { ThroughputSlaRow, type SlaTarget } from "./throughput-sla-row";

const DEFAULT_WINDOW_DAYS = 7;

function shiftDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateOnly(date);
}

function isDateString(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function hasActivity(metrics: ThroughputMetrics): boolean {
  return (
    metrics.receiving.lines > 0 ||
    metrics.picking.linesTotal > 0 ||
    metrics.shipping.shipped > 0
  );
}

/**
 * B10 — what the warehouse did, and whether it did it on time.
 *
 * `GET inventory/reports/throughput` has had no UI at all; every figure here is
 * one it already computes, already scoped to the warehouses the reader is
 * assigned to through the same predicate on all three halves — receiving by its
 * location, picking and shipping by their warehouse. So a supervisor of site A
 * cannot see site B's receipts in the discrepancy rate, and that is enforced in
 * SQL rather than by anything on this page.
 *
 * The window lives in the URL, so a drill-through can carry it and a shared link
 * shows the same numbers.
 */
export function ThroughputDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canView = useCan(THROUGHPUT_READ_KEY);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const window = useMemo(
    () => ({
      from: isDateString(fromParam) ? fromParam : shiftDays(DEFAULT_WINDOW_DAYS),
      to: isDateString(toParam) ? toParam : formatDateOnly(new Date()),
    }),
    [fromParam, toParam],
  );

  const metrics = useThroughputMetrics(window);

  function handleWindowChange(range: { from: string; to: string }): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", range.from);
    params.set("to", range.to);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleRetry(): void {
    void metrics.refetch();
  }

  const data = metrics.data;

  const slaTargets: readonly SlaTarget[] = data
    ? [
        {
          label: "Receiving discrepancy rate",
          value: data.receiving.lines === 0 ? null : data.receiving.discrepancyRate,
          format: "rate",
          meets: 0.02,
          watches: 0.05,
          basis: `${data.receiving.discrepancyLines} of ${data.receiving.lines} received lines`,
        },
        {
          label: "Pick exception rate",
          value: data.picking.linesTotal === 0 ? null : data.picking.exceptionRate,
          format: "rate",
          meets: 0.03,
          watches: 0.08,
          basis: `${data.picking.exceptionLines} of ${data.picking.linesTotal} pick lines`,
        },
        {
          label: "Median transit time",
          value: data.shipping.medianTransitHours,
          format: "hours",
          meets: 48,
          watches: 96,
          basis: `${data.shipping.delivered} of ${data.shipping.shipped} shipments delivered`,
        },
      ]
    : [];

  const filters = (
    <div className={FILTER_TOOLBAR_ROW}>
      <DateRangePicker
        from={window.from}
        to={window.to}
        onChange={handleWindowChange}
        className="shrink-0"
      />
    </div>
  );

  return (
    <PageWrapper
      title="Operations SLA"
      subtitle={`Receiving, picking and shipping between ${formatShortDate(window.from)} and ${formatShortDate(window.to)}.`}
      filters={canView ? filters : undefined}
    >
      {!canView ? (
        <NoPermissionState className="flex-1" permission={THROUGHPUT_READ_KEY} />
      ) : metrics.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load throughput"
          description={getErrorMessage(metrics.error)}
          onRetry={handleRetry}
        />
      ) : metrics.isLoading || !data ? (
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <StatCardGridSkeleton cols={4} />
          <StatCardGridSkeleton cols={3} />
          <StatCardGridSkeleton cols={3} />
        </div>
      ) : !hasActivity(data) ? (
        <EmptyState
          className="flex-1 min-h-0"
          illustration={<EmptyChartIllustration />}
          title="Nothing moved in this window"
          description="No receipts, picks or shipments were recorded in the warehouses you are assigned to. Widen the dates to look further back."
        />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          <ThroughputSlaRow targets={slaTargets} />

          <ThroughputSection
            title="Receiving"
            icon={PackageCheck}
            drillHref={`/inventory/operations/receipts?dateFrom=${window.from}&dateTo=${window.to}`}
            drillLabel="Open these receipts"
          >
            <StatCardGrid cols={3}>
              <StatCard label="Receipts" value={data.receiving.receipts} tone="blue" />
              <StatCard label="Lines received" value={data.receiving.lines} />
              <StatCard
                label="Lines with a discrepancy"
                value={data.receiving.discrepancyLines}
                tone={data.receiving.discrepancyLines > 0 ? "amber" : "default"}
              />
            </StatCardGrid>
          </ThroughputSection>

          <ThroughputSection
            title="Picking"
            icon={ListChecks}
            drillHref="/inventory/operations/picking?view=exceptions&ownership=ANY"
            drillLabel="Open the exception queue"
            caveat="The wave queue cannot be filtered by date, so this link opens every open exception rather than only this window's."
          >
            <StatCardGrid cols={4}>
              <StatCard label="Waves completed" value={data.picking.wavesCompleted} tone="blue" />
              <StatCard label="Pick lines" value={data.picking.linesTotal} />
              <StatCard label="Lines confirmed" value={data.picking.linesConfirmed} />
              <StatCard
                label="Exception lines"
                value={data.picking.exceptionLines}
                tone={data.picking.exceptionLines > 0 ? "amber" : "default"}
              />
            </StatCardGrid>
          </ThroughputSection>

          <ThroughputSection
            title="Shipping"
            icon={Truck}
            drillHref="/inventory/shipments"
            drillLabel="Open shipments"
            caveat="The shipment list carries no date filter, so this link opens the current queue."
          >
            <StatCardGrid cols={3}>
              <StatCard label="Dispatched" value={data.shipping.shipped} tone="blue" />
              <StatCard label="Delivered" value={data.shipping.delivered} tone="emerald" />
              <StatCard
                label="Median transit"
                value={
                  data.shipping.medianTransitHours === null
                    ? "—"
                    : `${data.shipping.medianTransitHours.toFixed(1)}h`
                }
              />
            </StatCardGrid>
          </ThroughputSection>

          <p
            className={cn(
              "flex items-start gap-2 text-muted-foreground",
              typeScaleClass("dense"),
            )}
          >
            <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Every figure counts only the warehouses you are assigned to. A site you cannot see is
            left out of the totals rather than counted as zero, so these rates describe your sites
            and not the organisation.
          </p>
        </div>
      )}
    </PageWrapper>
  );
}

function ThroughputSection({
  title,
  icon: Icon,
  drillHref,
  drillLabel,
  caveat,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  drillHref: string;
  drillLabel: string;
  caveat?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function handleDrill(): void {
    router.push(drillHref);
  }

  return (
    <section className={cn(CONTENT_PANEL_SOLID, "flex flex-col gap-3 p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h2>
        <Button variant="outline" size="sm" onClick={handleDrill}>
          {drillLabel}
        </Button>
      </div>
      {children}
      {caveat ? (
        <p className={cn("text-muted-foreground", typeScaleClass("micro"))}>{caveat}</p>
      ) : null}
    </section>
  );
}
