"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportShell } from "./report-shell";
import { useWorkingCapital } from "@/hooks/api/accounting/reports";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatCurrencyFull } from "@/lib/format-utils";
import { TrendingUp, TrendingDown, Scale } from "lucide-react";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function WorkingCapitalReport() {
  const router = useRouter();
  const params = useSearchParams();
  const [asOf, setAsOf] = useState(params.get("asOf") ?? todayIso());

  const { data, isLoading, error, refetch } = useWorkingCapital(asOf);

  function handleAsOfChange(v: string): void {
    setAsOf(v);
    router.replace(`/accounting/reports/working-capital?asOf=${v}`);
  }

  function handleRetry(): void {
    void refetch();
  }

  const wc = data ? Number(data.workingCapital) : 0;
  const isPositive = wc >= 0;

  return (
    <ReportShell
      title="Working Capital"
      subtitle="Current assets vs current liabilities and working capital ratio as of a date."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <DatePicker
            id="wc-asof"
            value={asOf}
            onChange={handleAsOfChange}
            placeholder="As of date"
            className="w-[160px]"
          />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {isLoading ? (
          <div className="space-y-4">
            <StatCardGridSkeleton cols={4} />
            <Skeleton className="h-[160px] w-full rounded-xl" />
          </div>
        ) : error ? (
          <ErrorState
            title="Failed to load working capital"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : !data ? (
          <EmptyState
            illustration={<EmptyReportIllustration />}
            title="No data available"
            description="No balance sheet data found as of the selected date."
            compact
          />
        ) : (
          <div className="space-y-4">
            <StatCardGrid cols={4}>
              <StatCard
                label="Current Assets"
                value={formatCurrencyFull(Number(data.currentAssets))}
                icon={TrendingUp}
                tone="emerald"
                hint={`as of ${data.asOf}`}
              />
              <StatCard
                label="Current Liabilities"
                value={formatCurrencyFull(Number(data.currentLiabilities))}
                icon={TrendingDown}
                tone="red"
                hint={`as of ${data.asOf}`}
              />
              <StatCard
                label="Working Capital"
                value={formatCurrencyFull(Number(data.workingCapital))}
                icon={Scale}
                tone={isPositive ? "emerald" : "red"}
                delta={{ value: isPositive ? "Positive" : "Negative", direction: isPositive ? "up" : "down" }}
              />
              <StatCard
                label="Current Ratio"
                value={Number(data.ratio).toFixed(2)}
                icon={Scale}
                tone={Number(data.ratio) >= 1 ? "blue" : "amber"}
                hint={Number(data.ratio) >= 2 ? "Healthy" : Number(data.ratio) >= 1 ? "Adequate" : "Below threshold"}
              />
            </StatCardGrid>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Working Capital = Current Assets − Current Liabilities</p>
              <p className="text-xs text-muted-foreground">
                A current ratio of 2 or above is considered healthy. Below 1 indicates the company may have difficulty meeting short-term obligations.
              </p>
              <StatCardGrid cols={3}>
                <StatCard
                  label="Current Assets"
                  value={formatCurrencyFull(Number(data.currentAssets))}
                  tone="emerald"
                />
                <StatCard
                  label="Current Liabilities"
                  value={formatCurrencyFull(Number(data.currentLiabilities))}
                  tone="red"
                />
                <StatCard
                  label="Net Working Capital"
                  value={formatCurrencyFull(Number(data.workingCapital))}
                  tone={isPositive ? "accent" : "amber"}
                />
              </StatCardGrid>
            </div>
          </div>
        )}
      </div>
    </ReportShell>
  );
}
