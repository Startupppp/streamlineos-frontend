"use client";

import dynamic from "next/dynamic";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyChartIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportShell } from "./report-shell";
import { useBurnRate, useCashRunway } from "@/hooks/api/accounting/reports";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatCurrencyFull, formatINRCompact } from "@/lib/format-utils";
import { Flame, Clock, TrendingDown } from "lucide-react";

const BurnRateChart = dynamic(
  () =>
    import("./burn-rate-chart").then((m) => ({
      default: m.BurnRateChart,
    })),
  { ssr: false, loading: () => <Skeleton className="h-[268px] w-full rounded-xl" /> },
);

type BurnMonth = NonNullable<ReturnType<typeof useBurnRate>["data"]>["months"][number];

const BURN_MONTH_COLUMNS: DataTableColumn<BurnMonth>[] = [
  {
    key: "month",
    header: "Month",
    cell: (row) => row.month,
  },
  {
    key: "netOutflow",
    header: "Net Outflow",
    cell: (row) => formatCurrencyFull(Number(row.netOutflow)),
    className: "text-right font-mono tabular-nums",
    headerClassName: "text-right",
  },
];

function getBurnMonthRowKey(row: BurnMonth): string {
  return row.month;
}

export function BurnRateReport() {
  const burnQuery = useBurnRate();
  const runwayQuery = useCashRunway();

  function handleRetry(): void {
    void burnQuery.refetch();
    void runwayQuery.refetch();
  }

  const isLoading = burnQuery.isLoading || runwayQuery.isLoading;
  const error = burnQuery.error ?? runwayQuery.error;

  const projectedData =
    runwayQuery.data?.projectedMonths.map((m) => ({
      month: m.month.slice(5),
      balance: Number(m.projectedBalance),
    })) ?? [];

  const burnData = burnQuery.data;
  const runwayData = runwayQuery.data;

  return (
    <ReportShell
      title="Burn Rate & Cash Runway"
      subtitle="Average monthly cash outflow and projected months of runway."
    >
      <div className="flex flex-1 min-h-0 flex-col">
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="h-[220px] w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-8 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load burn rate data"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <div className="space-y-6">
          <StatCardGrid cols={3}>
            <StatCard
              label="Avg Burn Rate"
              value={burnData ? formatINRCompact(Number(burnData.averageBurnRate)) : "—"}
              icon={Flame}
              tone="red"
              hint="per month (3-month avg)"
            />
            <StatCard
              label="Current Cash"
              value={runwayData ? formatINRCompact(Number(runwayData.cashBalance)) : "—"}
              icon={TrendingDown}
              tone="blue"
            />
            <StatCard
              label="Runway"
              value={runwayData?.runwayMonths != null ? `${runwayData.runwayMonths} months` : "N/A"}
              icon={Clock}
              tone={
                runwayData?.runwayMonths != null
                  ? runwayData.runwayMonths >= 12
                    ? "emerald"
                    : runwayData.runwayMonths >= 6
                    ? "amber"
                    : "red"
                  : "default"
              }
              hint={runwayData?.runwayMonths != null
                ? runwayData.runwayMonths >= 12 ? "Healthy" : runwayData.runwayMonths >= 6 ? "Watch" : "Critical"
                : undefined}
            />
          </StatCardGrid>

          {projectedData.length > 0 ? (
            <BurnRateChart projectedData={projectedData} />
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-center min-h-[200px]">
              <EmptyState
                illustration={<EmptyChartIllustration />}
                title="No projection data"
                description="Cash runway projection will appear once burn rate history is available."
                compact
              />
            </div>
          )}

          {burnData && burnData.months.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2.5 bg-muted/40 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Outflow History</p>
              </div>
              <DataTable
                data={burnData.months}
                columns={BURN_MONTH_COLUMNS}
                getRowKey={getBurnMonthRowKey}
                minWidth="300px"
                className="rounded-none border-0 border-t border-border"
              />
            </div>
          )}
        </div>
      )}
      </div>
    </ReportShell>
  );
}
