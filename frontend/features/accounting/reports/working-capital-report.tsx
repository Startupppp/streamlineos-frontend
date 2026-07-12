"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { LoadingState, ErrorState } from "@/components/shared";
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
        <div className="flex flex-col gap-1">
          <label htmlFor="wc-asof" className="text-[11px] font-medium text-muted-foreground leading-none">
            As of
          </label>
          <DatePicker
            id="wc-asof"
            value={asOf}
            onChange={handleAsOfChange}
            placeholder="Pick a date"
            className="h-8 w-[160px] text-sm"
          />
        </div>
      }
    >
      {isLoading ? (
        <LoadingState variant="cards" rows={3} />
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
        <div className="space-y-6">
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

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-1">Working Capital = Current Assets − Current Liabilities</p>
            <p className="text-xs text-muted-foreground">
              A current ratio of 2 or above is considered healthy. Below 1 indicates the company may have difficulty meeting short-term obligations.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200/60 px-4 py-3">
                <p className="text-xs text-emerald-700 font-medium">Current Assets</p>
                <p className="text-xl font-bold tabular-nums text-emerald-700 mt-1">
                  {formatCurrencyFull(Number(data.currentAssets))}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-200/60 px-4 py-3">
                <p className="text-xs text-red-700 font-medium">Current Liabilities</p>
                <p className="text-xl font-bold tabular-nums text-red-700 mt-1">
                  {formatCurrencyFull(Number(data.currentLiabilities))}
                </p>
              </div>
              <div className={`rounded-lg border px-4 py-3 ${isPositive ? "bg-blue-50 border-blue-200/60" : "bg-amber-50 border-amber-200/60"}`}>
                <p className={`text-xs font-medium ${isPositive ? "text-blue-700" : "text-amber-700"}`}>Net Working Capital</p>
                <p className={`text-xl font-bold tabular-nums mt-1 ${isPositive ? "text-blue-700" : "text-amber-700"}`}>
                  {formatCurrencyFull(Number(data.workingCapital))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  );
}
